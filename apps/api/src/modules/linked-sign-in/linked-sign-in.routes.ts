import { Router } from 'express';
import logger from '@/config/logger';
import { ErrorCode } from '@/core/shared/error-code';
import { webOrigin } from '@/utils/helpers';
import { type FinishResult, type LinkedSignInService } from './linked-sign-in.service';
import { devAuthorizePage } from './providers/dev';
import { SignInProviderName } from './providers/sign-in-provider';

// Web app routes (apps/web/src/constants): failures show on the page the flow started from
const webUrl = ({ connecting, error }: FinishResult) => {
  if (connecting) {
    return webPath('/account', error);
  }
  return error ? webPath('/sign-in', error) : webPath('/');
};

const webPath = (path: string, error?: ErrorCode) => {
  const url = new URL(path, webOrigin());
  if (error) {
    url.searchParams.set('error', error);
  }
  return url.toString();
};

/** The provider redirects the browser here: a page load, not GraphQL, so it answers with a redirect to the web app. */
export const linkedSignInRoutes = (service: LinkedSignInService): Router => {
  const router = Router();

  if (service.has(SignInProviderName.DEV)) {
    router.get('/auth/dev/authorize', devAuthorizePage);
  }

  router.get('/auth/:provider/callback', async (req, res) => {
    const name = req.params.provider.toUpperCase();
    if (!service.has(name)) {
      res.status(404).end();
      return;
    }
    const { code, state } = req.query;
    try {
      const result = await service.finish(
        name,
        {
          code: typeof code === 'string' ? code : undefined,
          state: typeof state === 'string' ? state : undefined,
        },
        { req, res }
      );
      res.redirect(webUrl(result));
    } catch (error) {
      logger.error('Linked sign-in callback failed', error instanceof Error ? error : { error });
      res.redirect(webUrl({ connecting: false, error: ErrorCode.SOMETHING_WENT_WRONG }));
    }
  });

  return router;
};
