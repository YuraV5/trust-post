import { Inject, Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { APP_NODE_MODE } from '../../../common/consts';
import { RedisConnectionConfig, RedisHealth } from '../interfaces';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

@Injectable()
export class RedisConnectionManager implements OnModuleInit, OnApplicationShutdown {
  private client: Redis;
  private redisConfig: RedisConnectionConfig;
  private maxRetries: number;
  private retryDelayMs: number;
  private gracefulShutdownTimeoutMs: number;
  private connectedAt: Date | null = null;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {
    this.loadConfig();
  }

  onModuleInit(): void {
    this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.gracefulShutdown();
  }

  private loadConfig(): void {
    const nodeEnv = this.config.get<string>('nodeEnv');
    const isProd = nodeEnv === APP_NODE_MODE.PROD;

    this.redisConfig = {
      host: this.config.get<string>('redis.host', 'localhost'),
      port: this.config.get<number>('redis.port', 6379),
      password: isProd ? this.config.get('redis.password', undefined) : undefined,
      db: this.config.get<number>('redis.dbCache', 0),
    };

    this.maxRetries = this.config.get<number>('redis.maxRetries', 3);
    this.retryDelayMs = this.config.get<number>('redis.retryDelayMs', 100);
    this.gracefulShutdownTimeoutMs = this.config.get<number>('redis.gracefulShutdownTimeoutMs', 5000);
  }

  private connect(): void {
    if (this.client) return;

    this.client = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password,
      db: this.redisConfig.db,
      retryStrategy: (times) => {
        if (times > this.maxRetries) {
          this.logger.error('Redis max retries reached', {
            context: 'RedisConnectionManager',
            maxRetries: this.maxRetries,
          });
          return null;
        }
        const delay = Math.min(times * this.retryDelayMs, 2000);
        this.logger.warn('Redis retry attempt', {
          context: 'RedisConnectionManager',
          attempt: times,
          delayMs: delay,
        });
        return delay;
      },
    });

    this.client.on('error', (err) =>
      this.logger.error('Redis connection error', { error: err, context: 'RedisConnectionManager' }),
    );
    this.client.on('ready', () =>
      this.logger.info('Redis ready', { context: 'RedisConnectionManager', db: this.redisConfig.db }),
    );
  }

  async healthCheck(): Promise<RedisHealth> {
    try {
      if (!this.client) {
        return { status: 'down', db: this.redisConfig.db, error: 'Client not initialized' };
      }

      await this.client.ping();
      return {
        status: 'up',
        db: this.redisConfig.db,
        connectedAt: this.connectedAt || undefined,
      };
    } catch (error) {
      return {
        status: 'down',
        db: this.redisConfig.db,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async gracefulShutdown(): Promise<void> {
    if (!this.client) return;

    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        this.logger.warn('Redis graceful shutdown timeout exceeded', {
          context: 'RedisConnectionManager',
          timeoutMs: this.gracefulShutdownTimeoutMs,
        });
        this.client.disconnect();
        resolve();
      }, this.gracefulShutdownTimeoutMs);

      this.client
        .quit()
        .then(() => {
          clearTimeout(timeoutHandle);
          this.logger.info('Redis connection closed gracefully', {
            context: 'RedisConnectionManager',
            db: this.redisConfig.db,
          });
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeoutHandle);
          this.logger.error('Redis graceful shutdown error', {
            error: err as Error,
            context: 'RedisConnectionManager',
          });
          resolve();
        });
    });
  }

  getClient(): Redis {
    if (!this.client) throw new Error('Redis not connected');
    return this.client;
  }
}
