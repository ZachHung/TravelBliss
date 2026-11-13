import { ErrorCode } from '@/core/shared/error-code';
import { BaseException } from '@/core/shared/exception';
import { type User } from './user.entity';

export class UserNotFoundException extends BaseException<User> {
  constructor() {
    super('User not found', ErrorCode.USER_NOT_FOUND);
  }
}

export class UserExistException extends BaseException<User> {
  constructor(where?: keyof User) {
    super('User already exist', ErrorCode.USER_EXISTED, where);
  }
}

export class WrongPassException extends BaseException<User> {
  constructor() {
    super('Wrong password', ErrorCode.WRONG_PASSWORD);
  }
}
