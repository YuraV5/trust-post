import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRedisService } from '../interfaces';
import { APP_MODE } from '../../../common/consts';
import { RedisConnectionManager } from '../factories/redis-connection.manager';

@Injectable()
export class RedisService implements IRedisService {
  constructor(
    private connectionManager: RedisConnectionManager,
    private config: ConfigService,
  ) {}

  async get(key: string): Promise<string | null> {
    return this.connectionManager.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.connectionManager.getClient().setex(key, ttlSeconds, value);
    } else {
      await this.connectionManager.getClient().set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.connectionManager.getClient().del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.connectionManager.getClient().ttl(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.connectionManager.getClient().exists(key)) === 1;
  }

  async flushDb(): Promise<void> {
    if (this.config.get('nodeEnv') === APP_MODE.PRODUCTION) {
      return;
    }
    await this.connectionManager.getClient().flushdb();
  }
}
