import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@/core/shared/entity';
import { User } from '@/modules/user/user.entity';
import { SignInProviderName } from './providers/sign-in-provider';

/** One way a user signs in through an outside provider (GLOSSARY: Linked sign-in). */
@ObjectType()
@Entity()
@Unique(['provider', 'providerUserId'])
export class LinkedSignIn extends BaseEntity {
  @Field(() => SignInProviderName)
  @Column({ type: 'varchar' })
  public readonly provider: SignInProviderName;

  // Never a GraphQL field: the provider's id for the person is no client's business
  @Column()
  public readonly providerUserId: string;

  @Column()
  public readonly userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  public readonly user?: User;
}
