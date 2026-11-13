import { Redis } from 'ioredis';
import { getEnv } from '@/utils/helpers';
import logger from './logger';

const redisClient = new Redis(getEnv('API_REDIS_URI'));
// ioredis emits an error on every reconnect attempt: log once per outage, and once on recovery
let isDown = false;
redisClient.on('error', (error: Error) => {
  if (!isDown) {
    isDown = true;
    logger.error('Redis connection lost, retrying', { error: error.message });
  }
});
redisClient.on('ready', () => {
  if (isDown) {
    isDown = false;
    logger.info('Redis reconnected');
  }
});

export default redisClient;
