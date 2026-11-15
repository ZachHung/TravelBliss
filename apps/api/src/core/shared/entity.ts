import { Field, ObjectType } from 'type-graphql';
import { CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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
  @UpdateDateColumn()
  public readonly updatedAt: Date;
}
