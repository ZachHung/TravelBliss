import { type ResolverData } from 'type-graphql';
import { type UserRepository } from '../../modules/user/user.repository';
import { type Context } from '../../types';
import { CustomAuthChecker } from './auth-checker.middleware';

const check = (findOne: () => Promise<unknown>, userId?: string, roles: string[] = []) =>
  new CustomAuthChecker({ findOne } as unknown as UserRepository).check(
    { context: { auth: userId ? { userId } : undefined } } as ResolverData<Context>,
    roles
  );

describe('CustomAuthChecker', () => {
  it('denies guests without touching the database', async () => {
    const findOne = vi.fn();

    await expect(check(findOne)).resolves.toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('allows an existing user, and checks roles when the field requires them', async () => {
    const findOne = async () => ({ id: 'u1', role: 'USER' });

    await expect(check(findOne, 'u1')).resolves.toBe(true);
    await expect(check(findOne, 'u1', ['ADMIN'])).resolves.toBe(false);
  });

  it('denies a deleted user', async () => {
    await expect(check(async () => null, 'u1')).resolves.toBe(false);
  });

  it('lets a database failure surface instead of reporting it as access denied', async () => {
    const outage = new Error('connect ECONNREFUSED 127.0.0.1:5432');

    await expect(check(() => Promise.reject(outage), 'u1')).rejects.toBe(outage);
  });
});
