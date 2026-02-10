import * as Joi from 'joi';

export const configValidation = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  CORS_ALLOW_ORIGIN: Joi.string().required(),
  SERVICE_NAME: Joi.string().default('work-link-service'),
  LOGGER_LEVEL: Joi.string().default('info'),

  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_TTL: Joi.number().default(300),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().required().default('work-link-service'),

  SESSION_EXPIRES_IN_MS: Joi.string().default('7d'), // Default to 7 days
});
