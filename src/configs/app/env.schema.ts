import * as Joi from 'joi';

export const configValidation = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  CORS_ALLOW_ORIGIN: Joi.string().required(),
  WS_CORS_ALLOW_ORIGIN: Joi.string().default(Joi.ref('CORS_ALLOW_ORIGIN')),
  TRUST_PROXY: Joi.boolean().truthy('true', '1', 'yes', 'on').falsy('false', '0', 'no', 'off').default(false),
  SWAGGER_ENABLED: Joi.boolean().truthy('true', '1', 'yes', 'on').falsy('false', '0', 'no', 'off').default(false),
  SERVICE_NAME: Joi.string().default('trust-post-service'),
  LOGGER_LEVEL: Joi.string().default('info'),
  FRONTEND_URL: Joi.string().uri().required(),
  SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),
  IDEMPOTENCY_ENABLED: Joi.boolean().truthy('true', '1', 'yes', 'on').falsy('false', '0', 'no', 'off').default(false),
  IDEMPOTENCY_INTERCEPTOR_TTL: Joi.number().default(300),
  THROTTLE_GLOBAL_LIMIT: Joi.number().integer().min(1).default(120),
  THROTTLE_GLOBAL_TTL_MS: Joi.number().integer().min(1000).default(60000),
  THROTTLE_BLOCK_TTL_MS: Joi.number().integer().min(1000).default(300000),

  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_TTL: Joi.number().default(300),
  REDIS_MAX_RETRIES: Joi.number().default(5),
  REDIS_RETRY_DELAY_MS: Joi.number().default(2000),
  REDIS_GRACEFUL_SHUTDOWN_TIMEOUT_MS: Joi.number().default(10000),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  JWT_ISSUER: Joi.string().required().default('trust-post-service'),

  SESSION_EXPIRES: Joi.string().default('7d'), // Default to 7 days

  EMAIL_RESEND_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().email().required(),

  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),

  WAYFORPAY_MERCHANT_ACCOUNT: Joi.string().required(),
  WAYFORPAY_MERCHANT_DOMAIN_NAME: Joi.string().required(),
  WAYFORPAY_SECRET_KEY: Joi.string().required(),
  WAYFORPAY_API_URL: Joi.string().uri().default('https://api.wayforpay.com/api'),
  WAYFORPAY_WEBHOOK_URL: Joi.string().uri().required(),
  WAYFORPAY_RETURN_URL: Joi.string().uri().required(),
  WAYFORPAY_ORDER_EXPIRES_AT: Joi.number().default(3600), // Default to 1 hour

  GOOGLE_OAUTH_CLIENT_ID: Joi.string().required(),
  GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_OAUTH_CALLBACK_URL: Joi.string().uri().required(),
  GOOGLE_OAUTH_API_KEY: Joi.string().required(),

  GEMINI_API_KEY: Joi.string().allow('').default(''),
});
