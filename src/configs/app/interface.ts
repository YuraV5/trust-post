export interface IAppConfig {
  nodeEnv: string;
  port: number;
  corsAllowOrigin: string;
  serviceName: string;
  loggerLevel: string;

  redis: { host: string; port: number; password: string; ttl: number };

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
}
