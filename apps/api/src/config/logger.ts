import dayjs from 'dayjs';
import { createLogger, format, transports } from 'winston';

import { getEnv } from '../utils/helpers';

const configFormat = [
  format.errors({ stack: true }),
  format.metadata(),
  format.timestamp({
    format: () => dayjs().format('YYYY-MM-DD HH:mm:ss:SSS'),
  }),
  format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] [${level}]: ${message}`;
  }),
];

const configFormatDev = [...configFormat, format.prettyPrint()];

const logger = createLogger({
  level: 'debug',
  format: format.combine(...(getEnv('NODE_ENV') !== 'production' ? configFormat : configFormatDev)),
  transports: [
    new transports.File({
      dirname: 'logs',
      filename: `${dayjs().format('YYYY-MM-DD')}.log`,
    }),
  ],
});

const env = getEnv('NODE_ENV').toUpperCase();

if (process.env.NODE_ENV !== 'production')
  logger.add(
    new transports.Console({
      level: 'debug',
      format: format.combine(
        format.metadata(),
        format.colorize(),
        format.timestamp({
          format: () => dayjs().format('HH:mm:ss'),
        }),
        format.printf(
          ({
            timestamp,
            level,
            message,
            metadata: {
              metadata: { stack },
            },
          }: Record<string, any>) => {
            if (stack) return `[${env}] [${timestamp}] [${level}]: ${stack}`;
            return `[${env}] [${timestamp}] [${level}]: ${message}`;
          },
        ),
      ),
    }),
  );

export default logger;
