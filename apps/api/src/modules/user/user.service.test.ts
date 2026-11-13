import 'reflect-metadata';

import { hash } from 'bcrypt';
import { validate } from 'class-validator';
import dayjs from 'dayjs';

import { User } from './user.entity';
import { UserErrorCodes } from './user.exception';
import { EditInfoInput } from './user.input';
import { UserService } from './user.service';

Object.assign(process.env, {
  SALT_ROUND: '4',
});

const setup = async () => {
  const user = { id: 'u1', username: 'x', password: await hash('secret123', 4) } as User;
  const repo = {
    findOneBy: async (where: Partial<User> | Partial<User>[]) =>
      [where]
        .flat()
        .some((cond) =>
          Object.entries(cond).every(([key, value]) => user[key as keyof User] === value),
        )
        ? user
        : null,
    save: vi.fn(),
  };
  const service = new UserService(repo as never);
  return { repo, service };
};

describe('UserService', () => {
  it('authenticate returns the user, or fails with the matching error', async () => {
    const { service } = await setup();

    await expect(
      service.authenticate({ usernameOrEmailOrPhone: 'x', password: 'secret123' } as never),
    ).resolves.toMatchObject({ id: 'u1' });
    await expect(
      service.authenticate({ usernameOrEmailOrPhone: 'x', password: 'nope' } as never),
    ).rejects.toMatchObject({ extensions: { code: UserErrorCodes.WRONG_PASSWORD } });
    await expect(
      service.authenticate({ usernameOrEmailOrPhone: 'nobody', password: 'x' } as never),
    ).rejects.toMatchObject({ extensions: { code: UserErrorCodes.USER_NOT_FOUND } });
  });

  it('turns a database unique violation into USER_EXISTED with the column', async () => {
    const { service, repo } = await setup();
    repo.findOneBy = async () => null;
    repo.save.mockRejectedValue({
      driverError: { code: '23505', detail: 'Key ("phoneNumber")=(0912345678) already exists.' },
    });

    await expect(
      service.register({
        username: 'a',
        email: 'a@b.c',
        phoneNumber: '1',
        password: 'secret123',
      } as never),
    ).rejects.toMatchObject({
      extensions: { code: UserErrorCodes.USER_EXISTED, where: 'phoneNumber' },
    });
  });
});

describe('User', () => {
  it('age counts only full years', () => {
    const user = Object.assign(new User(), {
      birthday: dayjs().subtract(25, 'year').add(1, 'day').toDate(),
    });
    expect(user.age()).toBe(24);
  });
});

describe('EditInfoInput', () => {
  it('accepts a partial update', async () => {
    const input = Object.assign(new EditInfoInput(), { fullName: 'An Nguyen' });
    expect(await validate(input)).toEqual([]);
  });
});
