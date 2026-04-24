import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../cache/services';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class PostsCacheService {
  private readonly postsListTtlSeconds: number;
  private readonly postByIdTtlSeconds: number;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.postsListTtlSeconds = this.configService.get<number>('cache.postsListTtlSeconds', 30);
    this.postByIdTtlSeconds = this.configService.get<number>('cache.postByIdTtlSeconds', 30);
  }

  async getUserPosts<T>(userId: string, query: unknown): Promise<T | null> {
    return this.read<T>(this.buildKey('user', userId, query));
  }

  async setUserPosts(userId: string, query: unknown, value: unknown): Promise<void> {
    await this.write(this.buildKey('user', userId, query), value, this.postsListTtlSeconds);
  }

  async getPublicPosts<T>(query: unknown): Promise<T | null> {
    return this.read<T>(this.buildKey('public', query));
  }

  async setPublicPosts(query: unknown, value: unknown): Promise<void> {
    await this.write(this.buildKey('public', query), value, this.postsListTtlSeconds);
  }

  async getStaffPosts<T>(query: unknown): Promise<T | null> {
    return this.read<T>(this.buildKey('staff', query));
  }

  async setStaffPosts(query: unknown, value: unknown): Promise<void> {
    await this.write(this.buildKey('staff', query), value, this.postsListTtlSeconds);
  }

  async getPostById<T>(postId: number): Promise<T | null> {
    return this.read<T>(this.buildKey('post', postId));
  }

  async setPostById(postId: number, value: unknown): Promise<void> {
    await this.write(this.buildKey('post', postId), value, this.postByIdTtlSeconds);
  }

  async invalidateLikeRelatedCache(postId: number, userId: string): Promise<void> {
    const exactKey = this.buildKey('post', postId);
    const wildcardPatterns = [this.buildKey('user', userId, '*'), this.buildKey('public', '*'), this.buildKey('staff', '*')];

    try {
      await this.redisService.del(exactKey);
    } catch (error) {
      this.logger.warn('Posts cache invalidation failed after like toggle', {
        key: exactKey,
        postId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    for (const pattern of wildcardPatterns) {
      try {
        await this.redisService.delByPattern(pattern);
      } catch (error) {
        this.logger.warn('Posts cache invalidation failed after like toggle', {
          pattern,
          postId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private buildKey(scope: string, ...parts: Array<string | number | object>): string {
    const suffix = parts
      .map((part) => (typeof part === 'string' || typeof part === 'number' ? String(part) : JSON.stringify(part)))
      .join(':');

    return `cache:posts:${scope}${suffix ? `:${suffix}` : ''}`;
  }

  private async read<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error('Posts cache read failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async write(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logger.error('Posts cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
