export interface IAppConfig {
  nodeEnv: string;
  port: number;
  corsAllowOrigin: string;
  serviceName: string;
  loggerLevel: string;
  frontUrl: string;

  redis: {
    host: string;
    port: number;
    password: string;
    ttl: number;
    dbAuth: number;
    dbCache: number;
    dbQueue: number;
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
}
