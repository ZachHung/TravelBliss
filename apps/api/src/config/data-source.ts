import { join } from 'path';

import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

import { getEnv } from '../utils/helpers';

export const postgresConfig: DataSourceOptions = {
  type: 'postgres',
  host: getEnv('POSTGRES_HOST'),
  port: +getEnv('POSTGRES_PORT'),
  username: getEnv('POSTGRES_USER'),
  password: getEnv('POSTGRES_PASSWORD'),
  database: getEnv('POSTGRES_DB'),
  synchronize: false,
  logging: getEnv('NODE_ENV') === 'production',
  entities: [join(__dirname, '..', '/modules/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '/migration/*.{js,ts}')],
  connectTimeoutMS: 10000,
  ssl: getEnv('NODE_ENV') === 'development' || getEnv('NODE_ENV') === 'production',
};

export const PostgresDataSource = new DataSource(postgresConfig);
