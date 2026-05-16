import winston from 'winston';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'linkedin-content-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        timestamp(),
        colorize(),
        process.env.NODE_ENV === 'development' ? devFormat : json()
      ),
    }),
    // File transports (only in development)
    ...(process.env.NODE_ENV !== 'production'
      ? [
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: combine(timestamp(), json()),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: combine(timestamp(), json()),
        }),
      ]
      : []),
  ],
  exceptionHandlers:
    process.env.NODE_ENV !== 'production'
      ? [new winston.transports.File({ filename: 'logs/exceptions.log' })]
      : [],
  rejectionHandlers:
    process.env.NODE_ENV !== 'production'
      ? [new winston.transports.File({ filename: 'logs/rejections.log' })]
      : [],
});

// Stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
