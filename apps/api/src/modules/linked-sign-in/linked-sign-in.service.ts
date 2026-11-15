import {
  ArcticFetchError,
  generateCodeVerifier,
  generateState,
  OAuth2RequestError,
  UnexpectedErrorResponseBodyError,
  UnexpectedResponseError,
} from 'arctic';
import { type Response } from 'express';
import { Redis } from 'ioredis';
import logger from '@/config/logger';
import TOKEN from '@/core/container/types.container';
import { ErrorCode } from '@/core/shared/error-code';
import { BaseException } from '@/core/shared/exception';
import { SessionService } from '@/modules/session/session.service';
import { UserService } from '@/modules/user/user.service';
import { type Context } from '@/types';
import { Inject, Injectable } from '@/types/inversify';
import { getEnv } from '@/utils/helpers';
import { LinkedSignIn } from './linked-sign-in.entity';
import {
  EmailTakenSignInToLinkException,
  LastSignInMethodException,
  LinkedSignInFailedException,
  LinkedSignInTakenException,
} from './linked-sign-in.exception';
import { LinkedSignInRepository } from './linked-sign-in.repository';
import {
  type ProviderProfile,
  type SignInProvider,
  type SignInProviderName,
} from './providers/sign-in-provider';

// Long enough to sign in at the provider, short enough that a leaked state is useless soon after
const FLOW_TTL_SECONDS = 10 * 60;
const flowKey = (state: string) => `linkedSignInFlow:${state}`;
const stateCookieName = () => `${getEnv('API_COOKIE_NAME')}_ls`;
const stateCookiePath = '/auth';

/** A started flow, kept server-side until the callback consumes it. userId set: connecting, not signing in. */
type Flow = { provider: SignInProviderName; codeVerifier: string; userId?: string };

/** How a callback ended, for the route to pick where the browser goes. */
export type FinishResult = { connecting: boolean; error?: ErrorCode };

const isProviderFailure = (error: unknown) =>
  error instanceof OAuth2RequestError ||
  error instanceof ArcticFetchError ||
  error instanceof UnexpectedResponseError ||
  error instanceof UnexpectedErrorResponseBodyError ||
  error instanceof LinkedSignInFailedException;

/**
 * Signing in and connecting through outside providers (docs/adr/0005-linked-sign-in.md). The rules live here once;
 * providers only turn a code into a profile, and SessionService starts the session.
 */
@Injectable()
export class LinkedSignInService {
  private readonly providers: Map<SignInProviderName, SignInProvider>;

  constructor(
    @Inject(TOKEN.SignInProviders) providers: SignInProvider[],
    @Inject(TOKEN.Repositories.LinkedSignIn) private readonly links: LinkedSignInRepository,
    @Inject(TOKEN.Services.User) private readonly users: UserService,
    @Inject(TOKEN.Services.Session) private readonly sessions: SessionService,
    @Inject(TOKEN.Store.Redis) private readonly store: Redis
  ) {
    this.providers = new Map(providers.map((provider) => [provider.name, provider]));
  }

  public providerNames(): SignInProviderName[] {
    return [...this.providers.keys()];
  }

  public has(name: string): name is SignInProviderName {
    return this.providers.has(name as SignInProviderName);
  }

  /**
   * Starts a flow and returns the provider's consent URL. Signed in (userId): the callback connects the provider to
   * that user. The state cookie binds the flow to this browser, so a URL sent to someone else cannot complete it.
   */
  public async start(
    name: SignInProviderName,
    userId: string | undefined,
    res: Response
  ): Promise<string> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new LinkedSignInFailedException();
    }
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const flow: Flow = { provider: name, codeVerifier, userId };
    await this.store.set(flowKey(state), JSON.stringify(flow), 'EX', FLOW_TTL_SECONDS);
    // The mode rides along, so a callback whose flow is gone still knows which page to return to
    res.cookie(stateCookieName(), `${userId ? 'connect' : 'sign-in'}:${state}`, {
      path: stateCookiePath,
      maxAge: FLOW_TTL_SECONDS * 1000,
      httpOnly: true,
      // As the refresh cookie: the API is cross-site from the web app in production
      sameSite: getEnv('NODE_ENV') === 'production' ? 'none' : 'lax',
      secure: getEnv('NODE_ENV') === 'production',
    });
    return provider.authorizationUrl(state, codeVerifier).toString();
  }

  /**
   * Completes the provider's redirect: signs in (a remembered session, ADR 0005) or connects. Expected failures come
   * back as an error code for the browser; anything else (database down) rejects.
   */
  public async finish(
    name: SignInProviderName,
    { code, state }: { code?: string; state?: string },
    ctx: Context
  ): Promise<FinishResult> {
    const { flow, connecting } = await this.consumeFlow(name, state, ctx);
    if (!flow) {
      return { connecting, error: ErrorCode.LINKED_SIGN_IN_FAILED };
    }

    try {
      // No code: the user cancelled at the provider (it sends ?error=access_denied instead)
      if (!code) {
        throw new LinkedSignInFailedException();
      }
      const profile = await this.providers.get(name)!.fetchProfile(code, flow.codeVerifier);
      const userId = await this.userFor(name, profile, flow.userId);
      if (!connecting) {
        await this.sessions.start(userId, { remember: true }, ctx);
      }
      return { connecting };
    } catch (error) {
      return { connecting, error: this.expectedFailure(name, error) };
    }
  }

  public async listFor(userId: string): Promise<LinkedSignIn[]> {
    return this.links.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  /** Removes one linked sign-in, unless it is the user's last way to sign in. */
  public async disconnect(linkId: string, userId: string): Promise<void> {
    const [links, user] = await Promise.all([this.listFor(userId), this.users.findById(userId)]);
    if (!links.some((link) => link.id === linkId)) {
      return;
    }
    if (!user.password && links.length === 1) {
      throw new LastSignInMethodException();
    }
    await this.links.delete({ id: linkId, userId });
  }

  /**
   * The flow this callback belongs to, if its state matches this browser's cookie; usable once. `connecting` comes
   * from the cookie, so it is known even when the flow is not (expired, replayed, forged).
   */
  private async consumeFlow(
    name: SignInProviderName,
    state: string | undefined,
    { req, res }: Context
  ): Promise<{ flow?: Flow; connecting: boolean }> {
    const [mode, cookieState] = String(req.cookies?.[stateCookieName()] ?? '').split(':');
    const connecting = mode === 'connect';
    res.clearCookie(stateCookieName(), { path: stateCookiePath });
    if (!state || state !== cookieState) {
      return { connecting };
    }
    // GETDEL: each flow completes once, so a replayed callback finds nothing
    const stored = await this.store.getdel(flowKey(state));
    const flow = stored ? (JSON.parse(stored) as Flow) : undefined;
    return flow?.provider === name ? { flow, connecting: !!flow.userId } : { connecting };
  }

  /** The code to show for an expected failure; rethrows anything else. */
  private expectedFailure(provider: SignInProviderName, error: unknown): ErrorCode {
    if (isProviderFailure(error)) {
      logger.warn('Linked sign-in refused by the provider', { provider, error: String(error) });
      return ErrorCode.LINKED_SIGN_IN_FAILED;
    }
    if (error instanceof BaseException) {
      return error.extensions.code as ErrorCode;
    }
    throw error;
  }

  /** The user this profile signs in as, linking or creating as needed. */
  private async userFor(
    provider: SignInProviderName,
    profile: ProviderProfile,
    connectingUserId: string | undefined
  ): Promise<string> {
    const existing = await this.links.findOneBy({
      provider,
      providerUserId: profile.providerUserId,
    });
    if (existing) {
      if (connectingUserId && existing.userId !== connectingUserId) {
        throw new LinkedSignInTakenException();
      }
      return existing.userId;
    }
    if (connectingUserId) {
      return this.link(provider, profile, connectingUserId);
    }
    // Never link by email: registration does not verify emails, so whoever registered this address first (maybe
    // not its owner) would keep a password into the account the owner then signs in to (ADR 0005)
    if (profile.email && (await this.users.findByEmail(profile.email))) {
      throw new EmailTakenSignInToLinkException();
    }
    // One transaction: a failure between the two would leave a user with no way to sign in
    return this.links.manager.transaction(async (manager) => {
      const user = await this.users.createWithoutPassword(profile, manager);
      await manager.insert(LinkedSignIn, {
        provider,
        providerUserId: profile.providerUserId,
        userId: user.id,
      });
      return user.id;
    });
  }

  private async link(
    provider: SignInProviderName,
    { providerUserId }: ProviderProfile,
    userId: string
  ): Promise<string> {
    await this.links.insert({ provider, providerUserId, userId });
    return userId;
  }
}
