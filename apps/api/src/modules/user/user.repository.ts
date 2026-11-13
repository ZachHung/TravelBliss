import { DataSource, Repository } from 'typeorm';

import TOKEN from '../../core/container/types.container';
import { Inject, Injectable } from '../../types/inversify';

import { User } from './user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(@Inject(TOKEN.DataSource.Postgres) appDataSource: DataSource) {
    super(User, appDataSource.createEntityManager());
  }
}
