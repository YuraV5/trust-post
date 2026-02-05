export interface IAppConfig {
  nodeEnv: string;
  port: number;
  corsAllowOrigin: string;
  serviceName: string;
  loggerLevel: string;

  db: { host: string; port: number; user: string; password: string; name: string };

  redis: { host: string; port: number; ttl: number };

  jwt: {
    accessSecret: string;
    accessExpiration: string;
    refreshSecret: string;
    refreshExpiration: string;
    issuer: string;
    audience?: string;
  };
}
