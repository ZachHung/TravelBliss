import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { SignedInUser } from '@/core/middlewares/signed-in-user.decorator';
import { SessionService } from '@/modules/session/session.service';
import { UserTokens } from '@/modules/session/session.type';
import type { Context } from '@/types';
import { Role } from '@/types/enums';
import { Inject, Injectable } from '@/types/inversify';
import { User } from './user.entity';
import {
  ChangePasswordInput,
  EditInfoInput,
  LoginInput,
  RegisterInput,
  SetPasswordInput,
} from './user.input';
import { UserService } from './user.service';

@Injectable()
@Resolver((_type) => User)
export class UserResolver {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(SessionService) private readonly sessionService: SessionService
  ) {}

  @Authorized()
  @Query((_type) => User)
  public me(@SignedInUser() user: User): User {
    return user;
  }

  @Authorized(Role.ADMIN)
  @Query((_type) => [User])
  public async allUser(): Promise<User[]> {
    const response = await this.userService.getAll();
    return response;
  }

  @Mutation((_type) => User)
  public async register(@Arg('input') input: RegisterInput): Promise<User> {
    const response = await this.userService.register(input);
    return response;
  }

  @Mutation((_type) => UserTokens)
  public async login(@Arg('input') input: LoginInput, @Ctx() ctx: Context): Promise<UserTokens> {
    const user = await this.userService.authenticate(input);
    return this.sessionService.start(user.id, { remember: !!input.hasRefresh }, ctx);
  }

  @Mutation((_type) => UserTokens)
  public async refreshToken(@Ctx() ctx: Context): Promise<UserTokens> {
    return this.sessionService.refresh(ctx);
  }

  @Authorized()
  @Mutation(() => Boolean)
  public async logout(@Ctx() ctx: Required<Context>): Promise<boolean> {
    return this.sessionService.end(ctx);
  }

  @Authorized()
  @Mutation((_type) => User)
  public async editInfoUser(
    @Arg('input') input: EditInfoInput,
    @SignedInUser() user: User
  ): Promise<User> {
    const response = await this.userService.editInfo(input, user.id);
    return response;
  }

  // Returns fresh tokens: changing the password ends every other session, including this device's old token
  @Authorized()
  @Mutation((_type) => UserTokens)
  public async changePasswordUser(
    @Arg('input') input: ChangePasswordInput,
    @Ctx() ctx: Required<Context>
  ): Promise<UserTokens> {
    await this.userService.changePassword(input, ctx.auth.user.id);
    return this.sessionService.endOtherSessions(ctx);
  }

  // No other session to end: until now this user could only sign in through a linked sign-in
  @Authorized()
  @Mutation((_type) => User)
  public async setPassword(
    @Arg('input') input: SetPasswordInput,
    @SignedInUser() user: User
  ): Promise<User> {
    return this.userService.setPassword(input.password, user.id);
  }
}
