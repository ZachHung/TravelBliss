import { createLogger, format, transports } from 'winston';
// Loads the root .env file first, so API_LOG_LEVEL and NODE_ENV are set below. Reads them raw, not through env():
// the logger reports why the API failed to start, so an invalid environment must not stop it loading.
import '@/config/env';

const isProduction = process.env.NODE_ENV === 'production';
const env = (process.env.NODE_ENV ?? 'unset').toUpperCase();

// Dev: one readable line, extra fields as JSON, stack on the following lines
const devLine = format.printf(({ timestamp, level, message, stack, ...fields }) => {
  const extra = Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : '';
  const trace = stack ? `\n${stack}` : '';
  return `[${env}] ${timestamp} ${level}: ${message}${extra}${trace}`;
});

// Stdout only: Docker and hosting platforms collect it, while a file inside a container is lost with it
const logger = createLogger({
  level: process.env.API_LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: isProduction
    ? format.combine(format.errors({ stack: true }), format.timestamp(), format.json())
    : format.combine(
        format.errors({ stack: true }),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.colorize(),
        devLine
      ),
  transports: [new transports.Console()],
});

export default logger;
