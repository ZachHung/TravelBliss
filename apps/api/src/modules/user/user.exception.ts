import { BaseException } from '../../core/shared/exception';

import { User } from './user.entity';

export enum UserErrorCodes {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_EXISTED = 'USER_EXISTED',
  WRONG_PASSWORD = 'WRONG_PASSWORD',
}

export class UserNotFoundException extends BaseException<User> {
  constructor() {
    super('User not found', UserErrorCodes.USER_NOT_FOUND);
  }
}

export class UserExistException extends BaseException<User> {
  constructor(where?: keyof User) {
    super('User already exist', UserErrorCodes.USER_EXISTED, where);
  }
}

export class WrongPassException extends BaseException<User> {
  constructor() {
    super('Wrong password', UserErrorCodes.WRONG_PASSWORD);
  }
}
