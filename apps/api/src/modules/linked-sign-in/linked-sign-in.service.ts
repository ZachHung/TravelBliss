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
import { type Repository } from 'typeorm';
import logger from '@/config/logger';
import TOKEN from '@/core/container/types.container';
import { InjectRepository } from '@/core/module';
import { ErrorCode } from '@/core/shared/error-code';
import { BaseException } from '@/core/shared/exception';
import { SessionService } from '@/modules/session/session.service';
import { User } from '@/modules/user/user.entity';
import { UserNotFoundException } from '@/modules/user/user.exception';
import { UserService } from '@/modules/user/user.service';
import { type Context } from '@/types';
import { Inject, Injectable } from '@/types/inversify';
import { cookieOptions, getEnv } from '@/utils/helpers';
import { LinkedSignIn } from './linked-sign-in.entity';
import {
  EmailTakenSignInToLinkException,
  LastSignInMethodException,
  LinkedSignInFailedException,
  LinkedSignInTakenException,
} from './linked-sign-in.exception';
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

// Postgres 23505, e.g. on linked_sign_in (provider, providerUserId)
const isUniqueViolation = (error: unknown) =>
  (error as { driverError?: { code?: string } } | null)?.driverError?.code === '23505';

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
    @InjectRepository(LinkedSignIn) private readonly links: Repository<LinkedSignIn>,
    @Inject(UserService) private readonly users: UserService,
    @Inject(SessionService) private readonly sessions: SessionService,
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
    res.cookie(
      stateCookieName(),
      `${userId ? 'connect' : 'sign-in'}:${state}`,
      cookieOptions({ path: stateCookiePath, maxAge: FLOW_TTL_SECONDS * 1000 })
    );
    return provider.authorizationUrl(state, codeVerifier).toString();
  }

  /**
   * Completes the provider's redirect: signs in (a remembered session, ADR 0005) or connects. Never rejects: every
   * outcome, unexpected ones included (logged), comes back as a result for the page the flow started from.
   */
  public async finish(
    name: SignInProviderName,
    { code, state }: { code?: string; state?: string },
    ctx: Context
  ): Promise<FinishResult> {
    // Read before anything can fail, so even a database outage returns to the right page
    const started = this.takeStateCookie(ctx);
    try {
      const flow = state === started.state ? await this.consumeFlow(name, state) : undefined;
      if (!flow) {
        return { connecting: started.connecting, error: ErrorCode.LINKED_SIGN_IN_FAILED };
      }
      // No code: the user cancelled at the provider (it sends ?error=access_denied instead)
      if (!code) {
        throw new LinkedSignInFailedException();
      }
      const profile = await this.providers.get(name)!.fetchProfile(code, flow.codeVerifier);
      const userId = await this.resolveUser(name, profile, flow.userId);
      if (!flow.userId) {
        await this.sessions.start(userId, { remember: true }, ctx);
      }
      return { connecting: !!flow.userId };
    } catch (error) {
      return { connecting: started.connecting, error: this.failureCode(name, error) };
    }
  }

  public async listFor(userId: string): Promise<LinkedSignIn[]> {
    return this.links.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  /** Removes one linked sign-in, unless it is the user's last way to sign in. */
  public async disconnect(linkId: string, userId: string): Promise<void> {
    await this.links.manager.transaction(async (manager) => {
      // Locks the user's row: a concurrent disconnect waits here, then counts what this one left
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UserNotFoundException();
      }
      const links = await manager.find(LinkedSignIn, { where: { userId } });
      if (!links.some((link) => link.id === linkId)) {
        return;
      }
      if (!user.password && links.length === 1) {
        throw new LastSignInMethodException();
      }
      await manager.delete(LinkedSignIn, { id: linkId, userId });
    });
  }

  /** The state cookie set by start (cleared now: it is single-use), and whether that flow was a connect. */
  private takeStateCookie({ req, res }: Context): { state?: string; connecting: boolean } {
    const [mode, state] = String(req.cookies?.[stateCookieName()] ?? '').split(':');
    res.clearCookie(stateCookieName(), cookieOptions({ path: stateCookiePath }));
    return { state: state || undefined, connecting: mode === 'connect' };
  }

  /** The flow for a state this browser started; usable once. */
  private async consumeFlow(name: SignInProviderName, state: string | undefined) {
    if (!state) {
      return;
    }
    // GETDEL: each flow completes once, so a replayed callback finds nothing
    const stored = await this.store.getdel(flowKey(state));
    const flow = stored ? (JSON.parse(stored) as Flow) : undefined;
    return flow?.provider === name ? flow : undefined;
  }

  /** The code to show for a failure. Unexpected ones (database down) are logged as errors too. */
  private failureCode(provider: SignInProviderName, error: unknown): ErrorCode {
    if (isProviderFailure(error)) {
      logger.warn('Linked sign-in refused by the provider', { provider, error: String(error) });
      return ErrorCode.LINKED_SIGN_IN_FAILED;
    }
    if (error instanceof BaseException) {
      return error.extensions.code as ErrorCode;
    }
    logger.error('Linked sign-in failed', error instanceof Error ? error : { error });
    return ErrorCode.SOMETHING_WENT_WRONG;
  }

  /**
   * userFor, once more if a concurrent callback for the same provider account (double-click, two tabs) inserted
   * the link first: the retry finds that link and answers as if it had been there all along.
   */
  private async resolveUser(
    provider: SignInProviderName,
    profile: ProviderProfile,
    connectingUserId: string | undefined
  ): Promise<string> {
    try {
      return await this.userFor(provider, profile, connectingUserId);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      return this.userFor(provider, profile, connectingUserId);
    }
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
