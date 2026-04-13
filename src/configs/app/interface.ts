export interface IAppConfig {
  nodeEnv: string;
  port: number;
  corsAllowOrigin: string;
  wsCorsAllowOrigin: string;
  trustProxy: boolean;
  swaggerEnabled: boolean;
  serviceName: string;
  loggerLevel: string;
  loggerFileMaxSizeMb: number;
  loggerFileMaxFiles: number;
  frontUrl: string;
  serviceUrl: string;
  idempotency: {
    interceptorTtl: number;
    enabled: boolean;
  };

  throttling: {
    globalLimit: number;
    globalTtlMs: number;
    blockTtlMs: number;
  };

  redis: {
    host: string;
    port: number;
    password?: string;
    ttl: number;
    maxRetries: number;
    retryDelayMs: number;
    gracefulShutdownTimeoutMs: number;
  };

  jwt: {
    accessSecret: string;
    accessExpiration: string;
    refreshSecret: string;
    refreshExpiration: string;
    oauthStateSecret: string;
    issuer: string;
    audience?: string;
  };

  session: {
    sessionDuration: string | number;
  };

  email: {
    resendApiKey: string;
    from: string;
  };

  cloudinary: {
    apiKey: string;
    apiSecret: string;
    cloudName: string;
  };

  wayforpay: {
    merchantAccount: string;
    merchantDomainName: string;
    secretKey: string;
    apiUrl: string;
    webhookUrl: string;
    returnUrl: string;
    orderExpiresAt: number;
  };

  googleOAuth: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    apiKey: string;
  };

  gemini: {
    apiKey: string;
  };
}
