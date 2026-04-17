import { IAppConfig } from './interface';

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export default (): IAppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT!, 10) || 3001,
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN || 'http://localhost:3001',
  wsCorsAllowOrigin: process.env.WS_CORS_ALLOW_ORIGIN || process.env.CORS_ALLOW_ORIGIN || 'http://localhost:3001',
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  swaggerEnabled: parseBoolean(process.env.SWAGGER_ENABLED, process.env.NODE_ENV !== 'production'),
  serviceName: process.env.SERVICE_NAME || 'trust-post',
  loggerLevel: process.env.LOGGER_LEVEL || 'info',
  loggerFileEnabled: parseBoolean(process.env.LOGGER_FILE_ENABLED, process.env.NODE_ENV !== 'test'),
  loggerFileMaxSizeMb: parseInt(process.env.LOGGER_FILE_MAX_SIZE_MB!, 10) || 10,
  loggerFileMaxFiles: parseInt(process.env.LOGGER_FILE_MAX_FILES!, 10) || 5,
  frontUrl: process.env.FRONTEND_URL!,
  serviceUrl: process.env.SERVICE_URL || 'http://localhost:3001',
  idempotency: {
    interceptorTtl: parseInt(process.env.IDEMPOTENCY_INTERCEPTOR_TTL!, 10) || 300,
    enabled: parseBoolean(process.env.IDEMPOTENCY_ENABLED, false),
  },

  throttling: {
    globalLimit: parseInt(process.env.THROTTLE_GLOBAL_LIMIT!, 10) || 120,
    globalTtlMs: parseInt(process.env.THROTTLE_GLOBAL_TTL_MS!, 10) || 60000,
    blockTtlMs: parseInt(process.env.THROTTLE_BLOCK_TTL_MS!, 10) || 300000,
    paymentAnonymousLimit: parseInt(process.env.THROTTLE_PAYMENT_ANONYMOUS_LIMIT!, 10) || 5,
    paymentAnonymousTtlMs: parseInt(process.env.THROTTLE_PAYMENT_ANONYMOUS_TTL_MS!, 10) || 60000,
    paymentAnonymousBlockTtlMs: parseInt(process.env.THROTTLE_PAYMENT_ANONYMOUS_BLOCK_TTL_MS!, 10) || 300000,
    paymentWebhookLimit: parseInt(process.env.THROTTLE_PAYMENT_WEBHOOK_LIMIT!, 10) || 30,
    paymentWebhookTtlMs: parseInt(process.env.THROTTLE_PAYMENT_WEBHOOK_TTL_MS!, 10) || 60000,
    paymentWebhookBlockTtlMs: parseInt(process.env.THROTTLE_PAYMENT_WEBHOOK_BLOCK_TTL_MS!, 10) || 300000,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || undefined,
    port: parseInt(process.env.REDIS_PORT!, 10) || 6379,
    ttl: parseInt(process.env.REDIS_TTL!, 10) || 300,
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES!, 10) || 3,
    retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS!, 10) || 100,
    gracefulShutdownTimeoutMs: parseInt(process.env.REDIS_GRACEFUL_SHUTDOWN_TIMEOUT_MS!, 10) || 5000,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    oauthStateSecret: process.env.JWT_OAUTH_STATE_SECRET!,
    issuer: process.env.JWT_ISSUER!,
  },

  session: {
    sessionDuration: process.env.SESSION_EXPIRES || '7d', // Default to 7 days
  },

  email: {
    resendApiKey: process.env.EMAIL_RESEND_API_KEY!,
    from: process.env.EMAIL_FROM || 'trust_post@example.com',
  },

  cloudinary: {
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  },

  wayforpay: {
    merchantAccount: process.env.WAYFORPAY_MERCHANT_ACCOUNT!,
    merchantDomainName: process.env.WAYFORPAY_MERCHANT_DOMAIN_NAME!,
    secretKey: process.env.WAYFORPAY_SECRET_KEY!,
    apiUrl: process.env.WAYFORPAY_API_URL || 'https://api.wayforpay.com/api',
    webhookUrl: process.env.WAYFORPAY_WEBHOOK_URL!,
    returnUrl: process.env.WAYFORPAY_RETURN_URL!,
    orderExpiresAt: process.env.WAYFORPAY_ORDER_EXPIRES_AT
      ? parseInt(process.env.WAYFORPAY_ORDER_EXPIRES_AT, 10)
      : 3600, // Default to 1 hour
  },

  googleOAuth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    callbackUrl: process.env.GOOGLE_OAUTH_CALLBACK_URL!,
    apiKey: process.env.GOOGLE_OAUTH_API_KEY!,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  maintenance: {
    deletedMessagesCleanupBatchLimit: parseInt(process.env.MESSAGES_CLEANUP_BATCH_LIMIT!, 10) || 200,
  },
});
