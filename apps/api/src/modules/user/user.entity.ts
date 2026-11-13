import dayjs from 'dayjs';
import { Authorized, Field, Int, ObjectType } from 'type-graphql';
import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../core/shared/entity';
import { Role } from '../../types/enums';

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

  @Field()
  @Column()
  public readonly birthday: Date;

  @Field((_type) => Int)
  public age(): number {
    return dayjs().diff(dayjs(this.birthday), 'year');
  }

  @Authorized(Role.ADMIN)
  @Field({ nullable: true })
  @Column()
  public readonly password: string;

  @Field()
  @Column({ unique: true })
  public readonly email: string;

  @Field()
  @Column({ unique: true })
  public readonly phoneNumber: string;

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
