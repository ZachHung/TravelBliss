import dayjs from 'dayjs';
import { randomBytes } from 'crypto';
import { compare, hash } from 'bcrypt';
import TOKEN from '@/core/container/types.container';
import Service from '@/core/shared/service';
import { Inject, Injectable } from '@/types/inversify';
import { getEnv, mutationReturn } from '@/utils/helpers';
import { User } from './user.entity';
import {
  PasswordAlreadySetException,
  UserExistException,
  UserNotFoundException,
  WrongPassException,
} from './user.exception';
import { ChangePasswordInput, LoginInput, RegisterInput } from './user.input';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService implements Service<User> {
  constructor(@Inject(TOKEN.Repositories.User) private readonly userRepository: UserRepository) {}

  public async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  public async register(input: RegisterInput): Promise<User> {
    // Cheap checks first, so taken names do not cost a bcrypt hash.
    for (const column of ['username', 'email', 'phoneNumber'] as const) {
      if (await this.userRepository.findOneBy({ [column]: input[column] })) {
        throw new UserExistException(column);
      }
    }

    const hashedPassword = await hash(input.password, +getEnv('API_SALT_ROUND'));

    try {
      return await this.userRepository.save({ ...input, password: hashedPassword });
    } catch (error) {
      throw this.toUserExist(error);
    }
  }

  /** Checks the credentials and returns the user; starting a session is SessionService's job. */
  public async authenticate({ password, usernameOrEmailOrPhone }: LoginInput): Promise<User> {
    const user = await this.userRepository.findOneBy([
      { username: usernameOrEmailOrPhone },
      { email: usernameOrEmailOrPhone },
      { phoneNumber: usernameOrEmailOrPhone },
    ]);

    if (!user) {
      throw new UserNotFoundException();
    }
    // No password (linked sign-ins only) fails like a wrong one, so it reveals nothing more
    if (!user.password || !(await compare(password, user.password))) {
      throw new WrongPassException();
    }
    return user;
  }

  public async getAll(): Promise<User[]> {
    const userList = await this.userRepository.find();
    return userList;
  }

  public async editInfo(input: Partial<User>, userId: string): Promise<User> {
    // GraphQL nullable inputs arrive as null; writing null would break NOT NULL columns.
    const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value != null));
    if (!Object.keys(changes).length) {
      return this.findById(userId);
    }

    try {
      return await mutationReturn<User>(
        // User query builder because of issue https://github.com/typeorm/typeorm/issues/2415
        this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({ ...changes, updatedAt: dayjs().toISOString() })
          .where('id = :id ', { id: userId })
          .returning('*')
          .execute()
      );
    } catch (error) {
      throw this.toUserExist(error);
    }
  }

  public async changePassword(input: ChangePasswordInput, userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user.password || !(await compare(input.oldPassword, user.password))) {
      throw new WrongPassException();
    }

    const newPassword = await hash(input.newPassword, +getEnv('API_SALT_ROUND'));
    return this.editInfo({ password: newPassword }, userId);
  }

  /** A first password for a user who joined through a linked sign-in; changing one goes through changePassword. */
  public async setPassword(password: string, userId: string): Promise<User> {
    if ((await this.findById(userId)).password) {
      throw new PasswordAlreadySetException();
    }
    return this.editInfo({ password: await hash(password, +getEnv('API_SALT_ROUND')) }, userId);
  }

  /** A user with no password, phone or birthday, as a linked sign-in creates one. */
  public async createWithoutPassword({
    fullName,
    email,
  }: {
    fullName: string;
    email: string | null;
  }): Promise<User> {
    // Usernames are unique and the provider has none: a readable stem plus a random suffix
    const stem =
      (email?.split('@')[0] ?? fullName).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'user';
    try {
      return await this.userRepository.save({
        fullName,
        email,
        username: `${stem}${randomBytes(3).toString('hex')}`,
      });
    } catch (error) {
      throw this.toUserExist(error);
    }
  }

  // Postgres unique violation (23505) -> the same error the pre-check gives, with the column name.
  private toUserExist(error: unknown): unknown {
    const { code, detail } = (error as { driverError?: { code?: string; detail?: string } })
      .driverError ?? { code: undefined, detail: undefined };
    if (code !== '23505') {
      return error;
    }
    return new UserExistException(/Key \("?(\w+)"?\)/.exec(detail ?? '')?.[1] as keyof User);
  }
}
