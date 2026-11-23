import http from 'http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { json } from 'express';
import { buildSchema } from 'type-graphql';
import { PostgresDataSource } from './config/data-source';
import logger from './config/logger';
import container from './core/container/config.container';
import {
  assignCorrelationId,
  CORRELATION_HEADER,
  formatError,
  loggingPlugin,
} from './core/logging';
import { authChecker } from './core/middlewares/auth-checker.middleware';
import { resolversOf } from './core/module';
import { withErrorCodes } from './core/shared/error-code';
import { modules } from './modules';
import { SessionService } from './modules/session/session.service';
import { type Context } from './types';
import { getEnv, webOrigin } from './utils/helpers';

export const bootstrap = async (): Promise<void> => {
  const isProduction = getEnv('NODE_ENV') === 'production';
  const app = express();
  const httpServer = http.createServer(app);
  await PostgresDataSource.initialize();
  // schema.graphql is written by `pnpm schema` (CI checks it is current), not on every start
  const schema = withErrorCodes(
    await buildSchema({
      validate: true,
      resolvers: resolversOf(modules),
      authChecker,
      container,
    })
  );

  const server = new ApolloServer<Context>({
    schema,
    csrfPrevention: true,
    cache: 'bounded',
    formatError: formatError(isProduction),
    plugins: [
      loggingPlugin,
      ApolloServerPluginInlineTrace(),
      // Sandbox and introspection are for development only: in production they publish the whole schema
      isProduction
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageLocalDefault({
            embed: { endpointIsEditable: false },
            includeCookies: true,
          }),
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
    introspection: !isProduction,
  });
  await server.start();
  app.set('trust proxy', isProduction);
  app.use(cookieParser());
  for (const { routes } of modules) {
    if (routes) {
      app.use(routes((id) => container.get(id)));
    }
  }
  app.use(
    '/',
    cors<cors.CorsRequest>({
      origin: webOrigin(),
      credentials: true,
      // Browsers hide non-standard response headers from JS unless they are listed here
      exposedHeaders: [CORRELATION_HEADER],
    }),
    assignCorrelationId,

    json(),

    expressMiddleware(server, {
      context: async ({ req, res }): Promise<Context> => {
        const auth = await container.get(SessionService).authenticate(req.headers.authorization);
        return { req, res, auth };
      },
    })
  );

  httpServer.listen(+getEnv('API_PORT'), () =>
    logger.info(
      `Server running in ${getEnv('NODE_ENV')} mode at http://localhost:${getEnv('API_PORT')}`
    )
  );
};
