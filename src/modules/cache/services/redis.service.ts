import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { IRedisService } from '../interfaces';
import { APP_NODE_MODE } from '../../../common/consts';

@Injectable()
export class RedisService implements IRedisService, OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis connection closed', { context: 'RedisService' });
    }
  }

  private async connect(): Promise<void> {
    if (this.client) return;

    this.client = new Redis({
      host: this.config.get('redis.host', 'localhost'),
      port: this.config.get<number>('redis.port', 6379),
      password: this.config.get('redis.password', undefined),
      db: this.config.get<number>('redis.dbAuth', 0), // Default to DB 0 for authentication tokens
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis max retries reached', { context: 'RedisService' });
          return null; // stop retrying
        }
        return Math.min(times * 100, 2000);
      },
    });

    this.client.on('error', (err) =>
      this.logger.error('Redis connection error', { error: err, context: 'RedisService' }),
    );
    this.client.on('connect', () => this.logger.info('Redis connected', { context: 'RedisService' }));
    this.client.on('ready', () => this.logger.info('Redis ready', { context: 'RedisService' }));
  }

  private getClient(): Redis {
    if (!this.client) throw new Error('Redis not connected');
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.getClient().setex(key, ttlSeconds, value);
    } else {
      await this.getClient().set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.getClient().ttl(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.getClient().exists(key)) === 1;
  }

  async flushDb(): Promise<void> {
    if (this.config.get('nodeEnv') === APP_NODE_MODE.PROD) {
      this.logger.warn('Attempt to flush Redis in production environment blocked', { context: 'RedisService' });
      return;
    }
    await this.getClient().flushdb();
  }
}
