import { IsDate, IsEmail, IsOptional, MinLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

import { User } from './user.entity';

@InputType()
export class RegisterInput implements Partial<User> {
  @IsDate()
  @Field()
  public readonly birthday: Date;

  @IsEmail()
  @Field()
  public readonly email: string;

  @Field()
  public readonly fullName: string;

  @Field()
  public readonly phoneNumber: string;

  @MinLength(8)
  @Field()
  public readonly password: string;

  @Field()
  public readonly username: string;
}

@InputType()
export class LoginInput implements Readonly<Pick<User, 'password'>> {
  @Field()
  public readonly password: string;

  @Field()
  public readonly usernameOrEmailOrPhone: string;

  @Field({ nullable: true })
  public readonly hasRefresh?: boolean;
}

@InputType()
export class EditInfoInput implements Partial<RegisterInput> {
  @IsOptional()
  @IsDate()
  @Field({ nullable: true })
  public readonly birthday?: Date;

  @IsOptional()
  @IsEmail()
  @Field({ nullable: true })
  public readonly email?: string;

  @Field({ nullable: true })
  public readonly fullName?: string;

  @Field({ nullable: true })
  public readonly username?: string;
}

@InputType()
export class ChangePasswordInput {
  @MinLength(8)
  @Field()
  public readonly oldPassword!: string;

  @MinLength(8)
  @Field()
  public readonly newPassword!: string;
}
