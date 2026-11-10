import { Redis } from 'ioredis';

import { getEnv } from '../utils/helpers';

import logger from './logger';

const redisClient = new Redis(getEnv('REDIS_URI'));
redisClient.on('error', async (error: Error) => {
  logger.error(new Error(`REDIS_${error.message}`));
});

export default redisClient;
