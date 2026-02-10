import { IAppConfig } from './interface';

export default (): IAppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT!, 10) || 3001,
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN || 'http://localhost:3001',
  serviceName: process.env.SERVICE_NAME || 'work-link-service',
  loggerLevel: process.env.LOGGER_LEVEL || 'info',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || '12345',
    port: parseInt(process.env.REDIS_PORT!, 10) || 6379,
    ttl: parseInt(process.env.REDIS_TTL!, 10) || 300,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    issuer: process.env.JWT_ISSUER!,
  },

  session: {
    expiresInMs: parseInt(process.env.SESSION_EXPIRES_IN_MS!, 10) || 604800000, // Default to 7 days
  },
});
