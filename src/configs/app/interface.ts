export interface IAppConfig {
  nodeEnv: string;
  port: number;
  corsAllowOrigin: string;
  serviceName: string;
  loggerLevel: string;
  frontUrl: string;
  serviceUrl: string;

  redis: {
    host: string;
    port: number;
    password: string;
    ttl: number;
    dbCache: number;
    dbQueue: number;
    maxRetries: number;
    retryDelayMs: number;
    gracefulShutdownTimeoutMs: number;
  };

  jwt: {
    accessSecret: string;
    accessExpiration: string;
    refreshSecret: string;
    refreshExpiration: string;
    issuer: string;
    audience?: string;
  };

  session: {
    expiresInMs: number;
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
    orderTimeout: number;
  };
}
