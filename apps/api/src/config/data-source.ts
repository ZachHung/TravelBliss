import { join } from 'path';

import 'reflect-metadata';

import { DataSource, type DataSourceOptions } from 'typeorm';
import { getEnv } from '../utils/helpers';

export const postgresConfig: DataSourceOptions = {
  type: 'postgres',
  host: getEnv('API_POSTGRES_HOST'),
  port: +getEnv('API_POSTGRES_PORT'),
  username: getEnv('API_POSTGRES_USER'),
  password: getEnv('API_POSTGRES_PASSWORD'),
  database: getEnv('API_POSTGRES_DB'),
  synchronize: false,
  logging: getEnv('NODE_ENV') === 'production',
  entities: [join(__dirname, '..', '/modules/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '/migration/*.{js,ts}')],
  connectTimeoutMS: 10000,
  ssl: process.env.API_POSTGRES_SSL === 'true',
};

export const PostgresDataSource = new DataSource(postgresConfig);
