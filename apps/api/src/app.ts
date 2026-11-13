import http from 'http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express4';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { json } from 'express';
import { buildSchema } from 'type-graphql';
import { PostgresDataSource } from './config/data-source';
import logger from './config/logger';
import container from './core/container/config.container';
import TOKEN from './core/container/types.container';
import {
  assignCorrelationId,
  CORRELATION_HEADER,
  formatError,
  loggingPlugin,
} from './core/logging';
import { CustomAuthChecker } from './core/middlewares/auth-checker.middleware';
import { type SessionService } from './modules/session/session.service';
import { resolvers } from './resolvers';
import { type Context } from './types';
import { getEnv } from './utils/helpers';

export const bootstrap = async (): Promise<void> => {
  const isProduction = getEnv('NODE_ENV') === 'production';
  const app = express();
  const httpServer = http.createServer(app);
  await PostgresDataSource.initialize();
  const schema = await buildSchema({
    emitSchemaFile: true,
    validate: true,
    resolvers,
    authChecker: CustomAuthChecker,
    container,
  });

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
  app.use(
    '/',
    cors<cors.CorsRequest>({
      origin: process.env.API_CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      // Browsers hide non-standard response headers from JS unless they are listed here
      exposedHeaders: [CORRELATION_HEADER],
    }),
    assignCorrelationId,

    json(),

    expressMiddleware(server, {
      context: async ({ req, res }): Promise<Context> => {
        const auth = await container
          .get<SessionService>(TOKEN.Services.Session)
          .authenticate(req.headers.authorization);
        return { req, res, auth };
      },
    })
  );

  httpServer.listen(+getEnv('API_PORT'), () =>
    logger.info(
      `Server running in ${getEnv('NODE_ENV')} mode at http://localhost${getEnv('API_PORT') && `:${getEnv('API_PORT')}`}`
    )
  );
};
