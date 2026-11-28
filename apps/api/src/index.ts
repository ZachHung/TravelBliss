import { env } from './config/env';
import logger from './config/logger';

(async (): Promise<void> => {
  try {
    // Before importing the app: data-source.ts and redis.ts read their settings as they load, so they would crash
    // here unlogged, naming only their own. This names every problem, through the catch below.
    env();
    const { bootstrap } = await import('./app');
    await bootstrap();
  } catch (error: unknown) {
    logger.error('Failed to start', error instanceof Error ? error : { error });
    // Exit so the container restarts (open connections would keep a dead server alive), but only once
    // the log is flushed: exiting right away can cut off the one line that says why.
    logger.on('finish', () => process.exit(1));
    logger.end();
  }
})();
