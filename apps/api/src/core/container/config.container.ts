import { Container } from 'inversify';
import { type DataSource } from 'typeorm';
import { PostgresDataSource } from '@/config/data-source';
import redisClient from '@/config/redis';
import { SessionModule } from '@/modules/session/session.module';
import { UserModule } from '@/modules/user/user.module';
import TOKEN from './types.container';

const container = new Container({ skipBaseClassChecks: true, defaultScope: 'Singleton' });

container.load(new UserModule(), new SessionModule());
container.bind<DataSource>(TOKEN.DataSource.Postgres).toConstantValue(PostgresDataSource);

container.bind(TOKEN.Store.Redis).toConstantValue(redisClient);

export default container;
