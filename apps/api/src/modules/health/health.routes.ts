import { Router } from 'express';
import { env } from '@/config/env';
import logger from '@/config/logger';

type Check = () => Promise<unknown>;
type Result = 'pass' | 'fail';

// A dependency that hangs (ioredis queues commands while reconnecting) must not hang the check
const TIMEOUT_MS = 1000;

const runCheck = async (name: string, check: Check): Promise<Result> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return 'pass';
  } catch (error) {
    logger.warn('Health check failed', {
      check: name,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'fail';
  } finally {
    clearTimeout(timer);
  }
};

/**
 * GET /health (#201): can this API do its job, and which commit is it? Public, so it names only pass or fail per
 * dependency; the reason goes to the log. 503 when any check fails. `version` is the image's GIT_SHA build arg.
 */
export const healthRoutes = (checks: Record<string, Check>, version = env().GIT_SHA): Router =>
  Router().get('/health', async (_req, res) => {
    const names = Object.keys(checks);
    const results = await Promise.all(names.map((name) => runCheck(name, checks[name])));
    const status: Result = results.every((result) => result === 'pass') ? 'pass' : 'fail';
    res
      .status(status === 'pass' ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json({
        status,
        version,
        checks: Object.fromEntries(names.map((name, i) => [name, results[i]])),
      });
  });
