import { createLogger, format, transports } from 'winston';
// Loads the root .env file first, so API_LOG_LEVEL and NODE_ENV are set below
import '../utils/helpers';

const isProduction = process.env.NODE_ENV === 'production';
const env = (process.env.NODE_ENV ?? 'development').toUpperCase();

// Dev: one readable line, extra fields as JSON, stack on the following lines
const devLine = format.printf(({ timestamp, level, message, stack, ...fields }) => {
  const extra = Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : '';
  return `[${env}] ${timestamp} ${level}: ${message}${extra}${stack ? `\n${stack}` : ''}`;
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
