import { join } from 'path';

import 'reflect-metadata';

import { DataSource, type DataSourceOptions } from 'typeorm';
import { env } from './env';

const settings = env();
const postgresConfig: DataSourceOptions = {
  type: 'postgres',
  host: settings.API_POSTGRES_HOST,
  port: settings.API_POSTGRES_PORT,
  username: settings.API_POSTGRES_USER,
  password: settings.API_POSTGRES_PASSWORD,
  database: settings.API_POSTGRES_DB,
  synchronize: false,
  // Off: it prints raw SQL with parameters (user emails, phones) outside our JSON log; DB errors reach
  // the log through the Apollo logging plugin instead
  logging: false,
  entities: [join(__dirname, '..', '/modules/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '/migration/*.{js,ts}')],
  connectTimeoutMS: 10000,
  ssl: settings.API_POSTGRES_SSL,
};

export const PostgresDataSource = new DataSource(postgresConfig);
