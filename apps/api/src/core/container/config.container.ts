import { Container } from 'inversify';
import { type DataSource } from 'typeorm';
import { PostgresDataSource } from '@/config/data-source';
import redisClient from '@/config/redis';
import { loadModules } from '@/core/module';
import { modules } from '@/modules';
import TOKEN from './types.container';

const container = new Container({ defaultScope: 'Singleton' });

container.bind<DataSource>(TOKEN.DataSource.Postgres).toConstantValue(PostgresDataSource);
container.bind(TOKEN.Store.Redis).toConstantValue(redisClient);
loadModules(container, modules);

export default container;
