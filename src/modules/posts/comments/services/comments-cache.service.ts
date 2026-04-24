import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../cache/services';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';

@Injectable()
export class CommentsCacheService {
  private readonly commentsListTtlSeconds: number;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.commentsListTtlSeconds = this.configService.get<number>('cache.commentsListTtlSeconds', 30);
  }

  async getByPostQuery<T>(postId: number, query: unknown, viewerId?: string): Promise<T | null> {
    return this.read<T>(
      this.buildKey('comments-by-post', {
        postId,
        viewerId: viewerId ?? null,
        query,
      }),
    );
  }

  async setByPostQuery(postId: number, query: unknown, value: unknown, viewerId?: string): Promise<void> {
    await this.write(
      this.buildKey('comments-by-post', {
        postId,
        viewerId: viewerId ?? null,
        query,
      }),
      value,
      this.commentsListTtlSeconds,
    );
  }

  private buildKey(scope: string, payload: unknown): string {
    return `cache:comments:${scope}:${JSON.stringify(payload)}`;
  }

  private async read<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error('Comments cache read failed', {
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
      this.logger.error('Comments cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
