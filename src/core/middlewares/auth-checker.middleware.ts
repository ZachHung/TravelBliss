import { Redis } from 'ioredis';
import { AuthCheckerInterface, ResolverData } from 'type-graphql';

import { UserRepository } from '../../modules/user/user.repository';
import { Context } from '../../types';
import { Inject, Injectable } from '../../types/inversify';
import TOKEN from '../container/types.container';

@Injectable()
export class CustomAuthChecker implements AuthCheckerInterface<Context> {
  constructor(
    @Inject(TOKEN.Store.Redis) private readonly store: Redis,
    @Inject(TOKEN.Repositories.User) private readonly userRepo: UserRepository,
  ) {}
  public async check(
    { context: { auth } }: ResolverData<Context>,
    roles: string[],
  ): Promise<boolean> {
    try {
      if (!auth || !auth.userId) return false;

      const isInBlackList = await this.store.get(`blacklist:${auth.token}`);
      if (!!isInBlackList) return false;

      const userId = auth.userId;
      if (!userId) return false;

      const user = await this.userRepo.findOne({ where: { id: userId } });

      if (!user) return false;

      if (!roles.includes(user.role) && roles.length !== 0) return false;

      return true;
    } catch {
      return false;
    }
  }
}
