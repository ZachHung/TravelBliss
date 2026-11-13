import { Field, ObjectType } from 'type-graphql';
import { type User } from '@/modules/user/user.entity';

/** The signed-in user of a request, loaded once by SessionService.authenticate. */
export interface AuthContext {
  user: User;
  token: string;
  exp: number;
}

@ObjectType()
export class UserTokens {
  @Field()
  public readonly accessToken: string;
}
