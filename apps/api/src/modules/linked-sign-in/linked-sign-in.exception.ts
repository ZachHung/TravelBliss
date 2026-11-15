import { ErrorCode } from '@/core/shared/error-code';
import { BaseException } from '@/core/shared/exception';
import { type LinkedSignIn } from './linked-sign-in.entity';

/** The provider refused or the flow was broken (cancelled, expired, replayed, forged state). */
export class LinkedSignInFailedException extends BaseException<LinkedSignIn> {
  constructor() {
    super('Signing in with the provider failed', ErrorCode.LINKED_SIGN_IN_FAILED);
  }
}

export class EmailTakenSignInToLinkException extends BaseException<LinkedSignIn> {
  constructor() {
    super(
      'A user with this email exists: sign in with your password, then connect the provider',
      ErrorCode.EMAIL_TAKEN_SIGN_IN_TO_LINK
    );
  }
}

export class LinkedSignInTakenException extends BaseException<LinkedSignIn> {
  constructor() {
    super('This provider account is linked to another user', ErrorCode.LINKED_SIGN_IN_TAKEN);
  }
}

export class LastSignInMethodException extends BaseException<LinkedSignIn> {
  constructor() {
    super(
      'Set a password before disconnecting your last linked sign-in',
      ErrorCode.LAST_SIGN_IN_METHOD
    );
  }
}
