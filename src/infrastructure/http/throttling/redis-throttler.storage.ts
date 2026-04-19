import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { REDIS_DB } from '../../../configs/redis/redis-db';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { AppServiceUnavailableException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '@app/shared/logger/services/app-logger';
import { type IAppLogger } from '@app/shared/logger/interfaces/interface';

type ThrottlerRecord = ThrottlerStorageRecord;

type LocalHitState = {
  hits: number;
  windowEndsAtMs: number;
};

const PAYMENT_THROTTLERS = new Set(['paymentsAnonymous', 'paymentsWebhook']);

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly client: Redis;
  private readonly isProduction: boolean;
  private readonly retryDelayMs: number;
  private readonly fallbackMaxKeys: number;
  private readonly localHits = new Map<string, LocalHitState>();
  private readonly localBlocks = new Map<string, number>();

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {
    this.isProduction = this.config.get<string>('nodeEnv') === 'production';
    this.retryDelayMs = this.config.get<number>('redis.retryDelayMs', this.isProduction ? 2000 : 250);
    this.fallbackMaxKeys = this.config.get<number>('throttling.redisFallbackMaxKeys', 10_000);

    this.client = new Redis({
      host: this.config.get<string>('redis.host', 'localhost'),
      port: this.config.get<number>('redis.port', 6379),
      password: this.config.get<string>('redis.password') || undefined,
      db: REDIS_DB.THROTTLING,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: this.isProduction ? (times) => Math.min(this.retryDelayMs * Math.max(times, 1), 5000) : undefined,
    });

    this.client.on('connect', () => {
      this.logger.info('Redis throttler connected');
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
    const keys = this.buildKeys(key, throttlerName);

    try {
      if (await this.isRedisReady()) {
        return await this.incrementInRedis(keys.hitKey, keys.blockKey, ttl, limit, blockDuration, key, throttlerName);
      }

      return this.redisUnavailableFallback(keys.hitKey, keys.blockKey, ttl, limit, blockDuration, key, throttlerName);
    } catch (error) {
      this.logger.error(`Throttler redis path failed, fallback used key=${key}: ${(error as Error).message}`);
      return this.redisUnavailableFallback(keys.hitKey, keys.blockKey, ttl, limit, blockDuration, key, throttlerName);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.info('Shutting down Redis throttler');

    if (this.client.status !== 'ready') {
      return;
    }

    try {
      await this.client.quit();
    } catch {
      // client may have disconnected between the status check and quit()
      this.logger.warn('Redis throttler client quit failed, it may have already been disconnected');
    }
  }

  private buildKeys(key: string, throttlerName: string): { hitKey: string; blockKey: string } {
    return {
      hitKey: `throttle:${throttlerName}:hits:${key}`,
      blockKey: `throttle:${throttlerName}:block:${key}`,
    };
  }

  private async isRedisReady(): Promise<boolean> {
    if (this.client.status === 'ready') {
      return true;
    }

    if (this.client.status === 'connecting' || this.client.status === 'connect') {
      return false;
    }

    try {
      await this.client.connect();
      return true;
    } catch (error) {
      this.logger.error(`Redis throttler connection failed: ${(error as Error).message}`);
      return false;
    }
  }

  private async incrementInRedis(
    hitKey: string,
    blockKey: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    key: string,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    const blockTtl = await this.client.pttl(blockKey);

    if (blockTtl > 0) {
      const hits = Number.parseInt((await this.client.get(hitKey)) ?? '0', 10) || limit + 1;
      const hitTtl = await this.client.pttl(hitKey);
      return this.buildBlockedResponse(hits, hitTtl, blockTtl, key, throttlerName);
    }

    const hits = await this.client.incr(hitKey);

    if (hits === 1) {
      await this.client.pexpire(hitKey, ttl);
    }

    let hitTtl = await this.client.pttl(hitKey);
    if (hitTtl < 0) {
      await this.client.pexpire(hitKey, ttl);
      hitTtl = ttl;
    }

    if (hits > limit) {
      const blockMs = this.resolveBlockDuration(blockDuration, ttl);
      await this.client.set(blockKey, '1', 'PX', blockMs);
      return this.buildBlockedResponse(hits, hitTtl, blockMs, key, throttlerName);
    }

    const response = {
      totalHits: hits,
      timeToExpire: this.toSeconds(hitTtl),
      isBlocked: false,
      timeToBlockExpire: 0,
    };

    if (!this.isProduction) {
      this.logger.debug(
        `[THROTTLE] ${throttlerName} key=${key} hits=${response.totalHits} ttl=${response.timeToExpire}s`,
      );
    }

    return response;
  }

  private buildBlockedResponse(
    hits: number,
    hitTtlMs: number,
    blockTtlMs: number,
    key: string,
    throttlerName: string,
  ): ThrottlerRecord {
    const response = {
      totalHits: hits,
      timeToExpire: this.toSeconds(hitTtlMs),
      isBlocked: true,
      timeToBlockExpire: this.toSeconds(blockTtlMs),
    };

    this.logger.warn(
      `[THROTTLE BLOCKED] ${throttlerName} key=${key} hits=${response.totalHits} blockTTL=${response.timeToBlockExpire}s`,
    );

    return response;
  }

  private redisUnavailableFallback(
    hitKey: string,
    blockKey: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    key: string,
    throttlerName: string,
  ): ThrottlerStorageRecord {
    if (PAYMENT_THROTTLERS.has(throttlerName)) {
      this.logger.error(`[THROTTLE REDIS DOWN] blocking payment route with 503, throttler=${throttlerName} key=${key}`);
      throw new AppServiceUnavailableException('Payment service is temporarily unavailable. Please retry shortly.');
    }

    const response = this.incrementInMemory(hitKey, blockKey, ttl, limit, blockDuration);
    this.logger.warn(
      `[THROTTLE FALLBACK INMEMORY] ${throttlerName} key=${key} hits=${response.totalHits} blocked=${response.isBlocked} blockTTL=${response.timeToBlockExpire}s`,
    );
    return response;
  }

  private incrementInMemory(
    hitKey: string,
    blockKey: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    this.compactInMemoryState();

    const now = Date.now();
    const blockedUntilMs = this.localBlocks.get(blockKey) ?? 0;
    if (blockedUntilMs > now) {
      const state = this.localHits.get(hitKey);
      return {
        totalHits: state?.hits ?? limit + 1,
        timeToExpire: this.toSeconds((state?.windowEndsAtMs ?? blockedUntilMs) - now),
        isBlocked: true,
        timeToBlockExpire: this.toSeconds(blockedUntilMs - now),
      };
    }

    const windowMs = ttl > 0 ? ttl : 1000;
    const existing = this.localHits.get(hitKey);
    const hasActiveWindow = !!existing && existing.windowEndsAtMs > now;
    const hits = hasActiveWindow ? existing.hits + 1 : 1;
    const windowEndsAtMs = hasActiveWindow ? existing.windowEndsAtMs : now + windowMs;

    this.localHits.set(hitKey, { hits, windowEndsAtMs });

    if (hits > limit) {
      const blockMs = this.resolveBlockDuration(blockDuration, ttl);
      const blockedUntil = now + blockMs;
      this.localBlocks.set(blockKey, blockedUntil);

      return {
        totalHits: hits,
        timeToExpire: this.toSeconds(windowEndsAtMs - now),
        isBlocked: true,
        timeToBlockExpire: this.toSeconds(blockMs),
      };
    }

    return {
      totalHits: hits,
      timeToExpire: this.toSeconds(windowEndsAtMs - now),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private compactInMemoryState(): void {
    const now = Date.now();

    for (const [key, blockedUntil] of this.localBlocks.entries()) {
      if (blockedUntil <= now) {
        this.localBlocks.delete(key);
      }
    }

    for (const [key, state] of this.localHits.entries()) {
      if (state.windowEndsAtMs <= now) {
        this.localHits.delete(key);
      }
    }

    while (this.localHits.size > this.fallbackMaxKeys) {
      const oldestKey = this.localHits.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.localHits.delete(oldestKey);
    }

    while (this.localBlocks.size > this.fallbackMaxKeys) {
      const oldestKey = this.localBlocks.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.localBlocks.delete(oldestKey);
    }
  }

  private resolveBlockDuration(blockDuration: number, ttl: number): number {
    if (blockDuration > 0) {
      return blockDuration;
    }
    return ttl > 0 ? ttl : 1000;
  }

  private toSeconds(milliseconds: number): number {
    if (!milliseconds || milliseconds <= 0) {
      return 0;
    }

    return Math.ceil(milliseconds / 1000);
  }
}
