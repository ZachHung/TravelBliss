import { Container } from 'inversify';
import { DataSource } from 'typeorm';

import { PostgresDataSource } from '../../config/data-source';
import redisClient from '../../config/redis';
import { SessionModule } from '../../modules/session/session.module';
import { UserModule } from '../../modules/user/user.module';
import { CustomAuthChecker } from '../middlewares/auth-checker.middleware';
import { ErrorLoggerMiddleware } from '../middlewares/error-logger.middleware';

import TOKEN from './types.container';

const container = new Container({ skipBaseClassChecks: true, defaultScope: 'Singleton' });

container.load(new UserModule(), new SessionModule());
container.bind<DataSource>(TOKEN.DataSource.Postgres).toConstantValue(PostgresDataSource);

// Bind Middlewares
container.bind<CustomAuthChecker>(CustomAuthChecker).to(CustomAuthChecker).inSingletonScope();
container
  .bind<ErrorLoggerMiddleware>(ErrorLoggerMiddleware)
  .to(ErrorLoggerMiddleware)
  .inSingletonScope();

container.bind(TOKEN.Store.Redis).toConstantValue(redisClient);

export default container;
