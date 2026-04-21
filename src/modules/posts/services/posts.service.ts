import { Inject, Injectable } from '@nestjs/common';
import { PostsLikeRepo, PostsRepo } from '../repos';
import { ResponseMessage } from '../../../common/types';
import { CreatePost, StaffPostUpdate, PaginatedResult, SortBy, EditUserPostStatus } from '../types';
import { Post } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException } from '../../../shared/errors/app-errors';
import { hasUpdatableFields } from '../../../common/utils';
import { IPostsService } from '../interfaces';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';
import { PostsQueueService } from '../queue';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { RedisService } from '../../cache/services';

@Injectable()
export class PostsService implements IPostsService {
  private readonly MAX_LIMIT = 100;
  private readonly POSTS_LIST_CACHE_TTL_SECONDS = 30;
  private readonly POST_BY_ID_CACHE_TTL_SECONDS = 30;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly postsRepo: PostsRepo,
    private readonly postLikeRepo: PostsLikeRepo,
    private readonly postQueue: PostsQueueService,
    private readonly redisService: RedisService,
  ) {}

  async create(authorId: string, data: CreatePost): Promise<Post> {
    const post = await this.postsRepo.create(authorId, data);
    try {
      await this.postQueue.assignReviewerToPost(post.id);
    } catch (error) {
      this.logger.error('Failed to enqueue reviewer assignment after post creation', {
        authorId,
        postId: post.id,
        error: error as Error,
      });
    }
    return post;
  }

  async getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<Post>> {
    const normalized = this.normalizeUserPostsQuery(query);
    const cacheKey = this.buildCacheKey('user-posts', { userId, query: normalized });

    const cached = await this.readCache<PaginatedResult<Post>>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.postsRepo.findByAuthorIdPaginated(userId, normalized);
    await this.writeCache(cacheKey, result, this.POSTS_LIST_CACHE_TTL_SECONDS);
    return result;
  }

  async getAllPublicPosts(query: PostsQueryDto): Promise<PaginatedResult<Post>> {
    const normalized = this.normalizePublicQuery(query);
    const cacheKey = this.buildCacheKey('public-posts', normalized);

    const cached = await this.readCache<PaginatedResult<Post>>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.postsRepo.findManyPublic(normalized);
    await this.writeCache(cacheKey, result, this.POSTS_LIST_CACHE_TTL_SECONDS);
    return result;
  }

  async getAllStaffPosts(query: PostsStaffQueryDto): Promise<PaginatedResult<Post>> {
    const normalized = this.normalizeStaffQuery(query);
    const cacheKey = this.buildCacheKey('staff-posts', normalized);

    const cached = await this.readCache<PaginatedResult<Post>>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.postsRepo.findManyStaff(normalized);
    await this.writeCache(cacheKey, result, this.POSTS_LIST_CACHE_TTL_SECONDS);
    return result;
  }

  async findById(id: number): Promise<Post> {
    const cacheKey = this.buildCacheKey('post-by-id', { id });
    const cached = await this.readCache<Post>(cacheKey);

    if (cached) {
      return cached;
    }

    const post = await this.postsRepo.getPostById(id);
    if (!post) {
      throw new AppNotFoundException('No posts found');
    }

    await this.writeCache(cacheKey, post, this.POST_BY_ID_CACHE_TTL_SECONDS);
    return post;
  }

  async findByIdForAuthor(id: number, authorId: string): Promise<Post> {
    const post = await this.postsRepo.getPostByIdForAuthor(id, authorId);
    if (!post) {
      throw new AppNotFoundException('No posts found');
    }
    return post;
  }

  async editUserPostStatus(postId: number, data: EditUserPostStatus): Promise<ResponseMessage> {
    const result = await this.postsRepo.updateStatus(postId, {
      postStatus: data.status,
      statusReason: data.statusReason,
    });
    if (!result) {
      throw new AppNotFoundException('No posts were updated');
    }
    return { message: 'Post status updated successfully' };
  }

  async update(postIds: number[], data: StaffPostUpdate): Promise<ResponseMessage> {
    if (!hasUpdatableFields(data)) {
      throw new AppBadRequestException('At least one field must be provided for update');
    }

    const result = await this.postsRepo.update(postIds, data);

    if (result.count === 0) {
      throw new AppNotFoundException('No posts were updated');
    }

    // Fire-and-log queue operations safely
    const queueResults = await Promise.allSettled(postIds.map((postId) => this.postQueue.assignReviewerToPost(postId)));

    // Log failed queue jobs but do not fail request
    queueResults.forEach((res, index) => {
      if (res.status === 'rejected') {
        this.logger.error('Failed to enqueue reviewer assignment', {
          postId: postIds[index],
          error: res.reason,
        });
      }
    });

    return { message: 'Post updated successfully' };
  }

  async delete(postIds: number[], statusReason?: string): Promise<ResponseMessage> {
    const result = await this.postsRepo.delete(postIds, statusReason);
    if (result.count === 0) {
      throw new AppNotFoundException('No posts were deleted');
    }
    return { message: 'Post deleted successfully' };
  }

  async deleteManyByAdmin(postIds: number[], adminId: string): Promise<ResponseMessage> {
    const result = await this.postsRepo.deleteByAdmin(postIds);
    if (result.count === 0) {
      throw new AppNotFoundException('No posts were deleted');
    }

    this.logger.info(`Admin id: ${adminId} deleted posts ${postIds.join(', ')}`);
    return { message: 'Posts deleted successfully' };
  }

  async toggleLike(postId: number, userId: string): Promise<{ message: string; liked: boolean }> {
    await this.findById(postId);

    const like = await this.postLikeRepo.getLikeByUserPost(postId, userId);

    if (like) {
      await this.postLikeRepo.deleteLike(postId, userId);
      await this.invalidateLikeRelatedCache(postId, userId);
      return { message: 'Like removed', liked: false };
    }

    await this.postLikeRepo.createLike(postId, userId);
    await this.invalidateLikeRelatedCache(postId, userId);
    return { message: 'Like added', liked: true };
  }

  private normalizePublicQuery(query: PostsQueryDto): NormalizedPublicQuery {
    const VALID_SORT_FIELDS = ['createdAt', 'targetDate', 'targetAmount', 'currentAmount'];

    const limit = Math.min(Math.max(query.limit || 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page || 1, 1);
    const sortBy = VALID_SORT_FIELDS.includes(query.sortBy as SortBy) ? (query.sortBy as SortBy) : 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return {
      page,
      limit,
      createdAt: query.createdAt,
      targetDate: query.targetDate,
      targetAmount: query.targetAmount,
      currentAmount: query.currentAmount,
      sortBy,
      sortOrder,
    };
  }

  private normalizeUserPostsQuery(query: UserPostsQueryDto): NormalizedUserQuery {
    const VALID_SORT_FIELDS = ['createdAt', 'targetDate', 'targetAmount', 'currentAmount'];

    const limit = Math.min(Math.max(query.limit || 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page || 1, 1);
    const sortBy = VALID_SORT_FIELDS.includes(query.sortBy as SortBy) ? (query.sortBy as SortBy) : 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return {
      page,
      limit,
      status: query.status,
      sortBy,
      sortOrder,
    };
  }

  private normalizeStaffQuery(query: PostsStaffQueryDto): NormalizedStaffQuery {
    const VALID_SORT_FIELDS = ['createdAt', 'targetDate', 'targetAmount', 'currentAmount'];

    const limit = Math.min(Math.max(query.limit || 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page || 1, 1);
    const sortBy = VALID_SORT_FIELDS.includes(query.sortBy as SortBy) ? (query.sortBy as SortBy) : 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return {
      page,
      limit,
      createdAt: query.createdAt,
      targetDate: query.targetDate,
      targetAmount: query.targetAmount,
      currentAmount: query.currentAmount,
      authorId: query.authorId,
      status: query.status,
      sortBy,
      sortOrder,
    };
  }

  private buildCacheKey(scope: string, payload: unknown): string {
    return `cache:posts:${scope}:${JSON.stringify(payload)}`;
  }

  private async readCache<T>(key: string): Promise<T | null> {
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

  private async writeCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logger.error('Posts cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async invalidateLikeRelatedCache(postId: number, userId: string): Promise<void> {
    const patterns = [
      `cache:posts:post-by-id:*\"id\":${postId}*`,
      `cache:posts:public-posts:*`,
      `cache:posts:user-posts:*\"userId\":\"${userId}\"*`,
      `cache:posts:staff-posts:*`,
    ];

    for (const pattern of patterns) {
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
}
