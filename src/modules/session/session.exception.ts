import { BaseEntity } from '../../core/shared/entity';
import { BaseException } from '../../core/shared/exception';

export enum SessionErrorCodes {
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_COOKIES = 'INVALID_COOKIES',
}

export class InvalidTokenException extends BaseException<BaseEntity> {
  constructor() {
    super('Invalid token', SessionErrorCodes.INVALID_TOKEN);
  }
}

export class InvalidCookiesException extends BaseException<BaseEntity> {
  constructor() {
    super('Invalid cookies', SessionErrorCodes.INVALID_COOKIES);
  }
}
