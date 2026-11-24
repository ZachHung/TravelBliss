import { type Redis } from 'ioredis';
import { type DataSource } from 'typeorm';
import TOKEN from '@/core/container/types.container';
import { defineModule } from '@/core/module';
import { healthRoutes } from './health.routes';

export const healthModule = defineModule({
  routes: (get) =>
    healthRoutes({
      postgres: () => get<DataSource>(TOKEN.DataSource.Postgres).query('SELECT 1'),
      redis: () => get<Redis>(TOKEN.Store.Redis).ping(),
    }),
});
