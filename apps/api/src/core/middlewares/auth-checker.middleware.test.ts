import { type ResolverData } from 'type-graphql';
import { type User } from '@/modules/user/user.entity';
import { type Context } from '@/types';
import { Role } from '@/types/enums';
import { authChecker } from './auth-checker.middleware';

const check = (user: Partial<User> | undefined, roles: string[] = []) =>
  authChecker(
    { context: { auth: user && { user, token: 't', exp: 0 } } } as ResolverData<Context>,
    roles
  );

describe('authChecker', () => {
  it('denies guests', () => {
    expect(check(undefined)).toBe(false);
  });

  it('allows any signed-in user when the field needs no role', () => {
    expect(check({ id: 'u1', role: Role.USER })).toBe(true);
  });

  it('checks the role when the field requires one', () => {
    expect(check({ id: 'u1', role: Role.USER }, [Role.ADMIN])).toBe(false);
    expect(check({ id: 'a1', role: Role.ADMIN }, [Role.ADMIN])).toBe(true);
  });
});
