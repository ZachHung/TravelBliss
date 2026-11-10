import http from 'http';

import { ApolloServer } from '@apollo/server';
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
import { CustomAuthChecker } from './core/middlewares/auth-checker.middleware';
import { ErrorLoggerMiddleware } from './core/middlewares/error-logger.middleware';
import { resolvers } from './resolvers';
import { Context } from './types';
import { getEnv, verifyToken } from './utils/helpers';

export const bootstrap = async (): Promise<void> => {
  const app = express();
  const httpServer = http.createServer(app);
  await PostgresDataSource.initialize();
  const schema = await buildSchema({
    emitSchemaFile: true,
    validate: true,
    resolvers: resolvers,
    globalMiddlewares: [ErrorLoggerMiddleware],
    authChecker: CustomAuthChecker,
    container,
  });

  const server = new ApolloServer<Context>({
    schema,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
      ApolloServerPluginInlineTrace(),
      ApolloServerPluginLandingPageLocalDefault({
        embed: { endpointIsEditable: false },
        includeCookies: true,
      }),
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
    introspection: true,
  });
  await server.start();
  app.set('trust proxy', getEnv('NODE_ENV') === 'production');
  app.use(cookieParser());
  app.use(
    '/',
    cors<cors.CorsRequest>({
      origin: 'http://localhost:5173',
      credentials: true,
    }),

    json(),

    expressMiddleware(server, {
      context: async ({ req, res }): Promise<Context> => {
        const authHeader = req.headers.authorization;
        let token = '';
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7, authHeader.length);
        }

        const auth = await verifyToken(token);
        return {
          req,
          res,
          auth,
        };
      },
    }),
  );

  httpServer.listen(+getEnv('PORT'), () =>
    logger.info(
      `Server running in ${getEnv('NODE_ENV')} mode at http://localhost${getEnv('PORT') && ':' + getEnv('PORT')}`,
    ),
  );
};
