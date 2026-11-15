import { DataSource, Repository } from 'typeorm';
import TOKEN from '@/core/container/types.container';
import { Inject, Injectable } from '@/types/inversify';
import { LinkedSignIn } from './linked-sign-in.entity';

@Injectable()
export class LinkedSignInRepository extends Repository<LinkedSignIn> {
  constructor(@Inject(TOKEN.DataSource.Postgres) appDataSource: DataSource) {
    super(LinkedSignIn, appDataSource.createEntityManager());
  }
}
