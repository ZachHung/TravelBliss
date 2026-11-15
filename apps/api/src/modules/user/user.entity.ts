import dayjs from 'dayjs';
import { Authorized, Field, Int, ObjectType } from 'type-graphql';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@/core/shared/entity';
import { Role } from '@/types/enums';

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @Column()
  public readonly fullName: string;

  @Field()
  public firstName(): string {
    return this.fullName.split(' ')[0];
  }

  @Field()
  public lastName(): string {
    return this.fullName.split(' ').slice(-1)[0];
  }

  // Null for users who joined through a linked sign-in: asked for when a booking needs it
  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  public readonly birthday: Date | null;

  @Field((_type) => Int, { nullable: true })
  public age(): number | null {
    return this.birthday && dayjs().diff(dayjs(this.birthday), 'year');
  }

  // Never a GraphQL field: no client, admin included, may read a password hash.
  // Null for a user who only signs in through linked sign-ins.
  @Column({ type: 'varchar', nullable: true })
  public readonly password: string | null;

  @Field()
  public hasPassword(): boolean {
    return !!this.password;
  }

  // Null when a provider shares no email (Facebook accounts registered by phone)
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', unique: true, nullable: true })
  public readonly email: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', unique: true, nullable: true })
  public readonly phoneNumber: string | null;

  @Field()
  @Column({ unique: true })
  public readonly username: string;

  @Authorized(Role.ADMIN)
  @Field(() => Role, { nullable: true })
  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  public readonly role: Role;

  // @Field(() => [Post], { nullable: 'items' })
  // @OneToMany(() => Post, (post: Post) => post.user)
  // private readonly posts?: Promise<Post[]>;
}
