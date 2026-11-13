import { Field, ObjectType } from 'type-graphql';

export interface AuthContext {
  userId: string;
  token: string;
  exp: number;
}

@ObjectType()
export class UserTokens {
  @Field()
  public readonly accessToken: string;
}
