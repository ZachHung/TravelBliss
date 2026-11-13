import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';

import TOKEN from '../../core/container/types.container';
import { Role } from '../../types/enums';
import { Inject, Injectable } from '../../types/inversify';
import { SessionService } from '../session/session.service';
import { UserTokens } from '../session/session.type';

import { User } from './user.entity';
import { ChangePasswordInput, EditInfoInput, LoginInput, RegisterInput } from './user.input';
import { UserService } from './user.service';

import type { Context } from '../../types';

@Injectable()
@Resolver((_type) => User)
export class UserResolver {
  constructor(
    @Inject(TOKEN.Services.User) private readonly userService: UserService,
    @Inject(TOKEN.Services.Session) private readonly sessionService: SessionService,
  ) {}

  @Authorized()
  @Query((_type) => User)
  public async me(@Ctx() { auth: { userId } }: Required<Context>): Promise<User> {
    const response = await this.userService.findById(userId);
    return response;
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
    @Ctx() { auth: { userId } }: Required<Context>,
  ): Promise<User> {
    const response = await this.userService.editInfo(input, userId);
    return response;
  }

  @Authorized()
  @Mutation((_type) => User)
  public async changePasswordUser(
    @Arg('input') input: ChangePasswordInput,
    @Ctx() { auth: { userId } }: Required<Context>,
  ): Promise<User> {
    const response = await this.userService.changePassword(input, userId);
    return response;
  }
}
