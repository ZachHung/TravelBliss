import { type BaseEntity } from '@/core/shared/entity';
import { ErrorCode } from '@/core/shared/error-code';
import { BaseException } from '@/core/shared/exception';

export class InvalidTokenException extends BaseException<BaseEntity> {
  constructor() {
    super('Invalid token', ErrorCode.INVALID_TOKEN);
  }
}

export class InvalidCookiesException extends BaseException<BaseEntity> {
  constructor() {
    super('Invalid cookies', ErrorCode.INVALID_COOKIES);
  }
}
