import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { REDIS_DB } from '../../../configs/redis/redis-db';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

type ThrottlerRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('redis.host', 'localhost'),
      port: this.config.get<number>('redis.port', 6379),
      password: this.config.get<string>('redis.password') || undefined,
      db: REDIS_DB.THROTTHLE,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis throttler connected');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis throttler error: ${error.message}`);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    const { hitKey, blockKey } = this.buildKeys(key, throttlerName);

    try {
      // 1. check block
      const blockTtl = await this.client.pttl(blockKey);

      if (blockTtl > 0) {
        return this.handleBlocked(hitKey, blockTtl, key, throttlerName);
      }

      // 2. increment + ttl (multi)
      const [hits] = await this.incrementWithTtl(hitKey, ttl);

      // 3. get ttl
      let hitTtl = await this.client.pttl(hitKey);

      if (hitTtl < 0) {
        await this.client.pexpire(hitKey, ttl);
        hitTtl = ttl;
      }

      // 4. check limit
      if (hits > limit) {
        await this.client.set(blockKey, '1', 'PX', blockDuration);

        const response = {
          totalHits: hits,
          timeToExpire: this.toSeconds(hitTtl),
          isBlocked: true,
          timeToBlockExpire: this.toSeconds(blockDuration),
        };

        this.logBlocked(response, key, throttlerName);
        return response;
      }

      const response = {
        totalHits: hits,
        timeToExpire: this.toSeconds(hitTtl),
        isBlocked: false,
        timeToBlockExpire: 0,
      };

      this.logOk(response, key, throttlerName);
      return response;
    } catch (error) {
      this.logger.error(`Throttler fallback (allow request) key=${key}: ${(error as Error).message}`);

      return this.allowFallback();
    }
  }

  // Cleanup on shutdown
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down Redis throttler');
    await this.client.quit();
  }

  // Helper methods build keys
  private buildKeys(key: string, throttlerName: string) {
    return {
      hitKey: `throttle:${throttlerName}:hits:${key}`,
      blockKey: `throttle:${throttlerName}:block:${key}`,
    };
  }

  // Increment hits and get TTL atomically
  private async incrementWithTtl(hitKey: string, ttl: number): Promise<[number]> {
    const multi = this.client.multi();

    multi.incr(hitKey);
    multi.pttl(hitKey);

    const results = await multi.exec();

    const hits = results?.[0]?.[1] as number;
    const currentTtl = results?.[1]?.[1] as number;

    // If it's the first hit or the key has no TTL, set the TTL
    if (hits === 1 || currentTtl < 0) {
      await this.client.pexpire(hitKey, ttl);
    }

    return [hits];
  }

  // Handle blocked case
  private async handleBlocked(
    hitKey: string,
    blockTtl: number,
    key: string,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    const hits = Number.parseInt((await this.client.get(hitKey)) ?? '0', 10) || 0;
    const hitTtl = await this.client.pttl(hitKey);

    const response = {
      totalHits: hits,
      timeToExpire: this.toSeconds(hitTtl),
      isBlocked: true,
      timeToBlockExpire: this.toSeconds(blockTtl),
    };

    this.logBlocked(response, key, throttlerName);
    return response;
  }

  // Logging helpers Log successful hits
  private logOk(response: ThrottlerRecord, key: string, throttlerName: string) {
    this.logger.debug(
      `[THROTTLE] ${throttlerName} key=${key} hits=${response.totalHits} ttl=${response.timeToExpire}s`,
    );
  }

  // Logging helpers Log blocked attempts
  private logBlocked(response: ThrottlerRecord, key: string, throttlerName: string) {
    this.logger.warn(
      `[THROTTLE BLOCKED] ${throttlerName} key=${key} hits=${response.totalHits} blockTTL=${response.timeToBlockExpire}s`,
    );
  }

  // Fallback to allow requests if Redis is unavailable
  private allowFallback(): ThrottlerStorageRecord {
    this.logger.debug('Throttler fallback: allowing request (Redis unavailable)');
    return {
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  // Convert milliseconds to seconds for response
  private toSeconds(milliseconds: number): number {
    if (!milliseconds || milliseconds <= 0) return 0;
    return Math.ceil(milliseconds / 1000);
  }
}
