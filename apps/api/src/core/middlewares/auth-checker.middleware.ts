import { AuthCheckerInterface, ResolverData } from 'type-graphql';
import TOKEN from '@/core/container/types.container';
import { UserRepository } from '@/modules/user/user.repository';
import { Context } from '@/types';
import { Inject, Injectable } from '@/types/inversify';

@Injectable()
export class CustomAuthChecker implements AuthCheckerInterface<Context> {
  constructor(@Inject(TOKEN.Repositories.User) private readonly userRepo: UserRepository) {}
  public async check(
    { context: { auth } }: ResolverData<Context>,
    roles: string[]
  ): Promise<boolean> {
    if (!auth?.userId) {
      return false;
    }

    // No try/catch: a database failure is an outage to log, not "access denied"
    const user = await this.userRepo.findOne({ where: { id: auth.userId } });

    if (!user) {
      return false;
    }

    return roles.length === 0 || roles.includes(user.role);
  }
}
