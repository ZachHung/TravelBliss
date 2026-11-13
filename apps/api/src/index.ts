import { bootstrap } from './app';
import logger from './config/logger';

(async (): Promise<void> => {
  try {
    await bootstrap();
  } catch (error: unknown) {
    logger.error('Failed to start', error instanceof Error ? error : { error });
    // Exit so the container restarts (open connections would keep a dead server alive), but only once
    // the log is flushed: exiting right away can cut off the one line that says why.
    logger.on('finish', () => process.exit(1));
    logger.end();
  }
})();
