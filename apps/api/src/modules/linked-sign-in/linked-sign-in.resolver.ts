import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { SignedInUser } from '@/core/middlewares/signed-in-user.decorator';
import { User } from '@/modules/user/user.entity';
import { UserService } from '@/modules/user/user.service';
import type { Context } from '@/types';
import { Inject, Injectable } from '@/types/inversify';
import { LinkedSignIn } from './linked-sign-in.entity';
import { LinkedSignInService } from './linked-sign-in.service';
import { SignInProviderName } from './providers/sign-in-provider';

@Injectable()
@Resolver((_type) => User)
export class LinkedSignInResolver {
  constructor(
    @Inject(LinkedSignInService) private readonly service: LinkedSignInService,
    @Inject(UserService) private readonly users: UserService
  ) {}

  @Query((_type) => [SignInProviderName], {
    description: 'Providers offered here, one button each',
  })
  public linkedSignInProviders(): SignInProviderName[] {
    return this.service.providerNames();
  }

  @FieldResolver((_type) => [LinkedSignIn])
  public async linkedSignIns(@Root() user: User): Promise<LinkedSignIn[]> {
    return this.service.listFor(user.id);
  }

  @Mutation((_type) => String, {
    description:
      "The provider's URL to send the browser to. Signed in, the provider is connected instead.",
  })
  public async startLinkedSignIn(
    @Arg('provider', (_type) => SignInProviderName) provider: SignInProviderName,
    @Ctx() { auth, res }: Context
  ): Promise<string> {
    return this.service.start(provider, auth?.user.id, res);
  }

  @Authorized()
  @Mutation((_type) => User)
  public async disconnectLinkedSignIn(
    @Arg('id') id: string,
    @SignedInUser() user: User
  ): Promise<User> {
    await this.service.disconnect(id, user.id);
    return this.users.findById(user.id);
  }
}
