import { bootstrap } from './app';
import logger from './config/logger';

(async (): Promise<void> => {
  try {
    await bootstrap();
  } catch (error: unknown) {
    logger.error(error);
    // Exit so the container restarts; otherwise open connections keep a dead server alive.
    process.exit(1);
  }
})();
