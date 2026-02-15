export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface RedisHealth {
  status: 'up' | 'down';
  db: number;
  connectedAt?: Date;
  error?: string;
}
