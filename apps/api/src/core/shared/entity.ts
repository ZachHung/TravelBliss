import { Field, ObjectType } from 'type-graphql';
import { CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@ObjectType()
export class BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  public readonly id: string;

  @Field()
  @CreateDateColumn()
  public readonly createdAt: Date;

  @Field()
  @CreateDateColumn()
  public readonly updatedAt: Date;
}
