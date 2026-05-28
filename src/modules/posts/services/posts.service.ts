import { Inject, Injectable } from '@nestjs/common';
import { PostsLikeRepo, PostsRepo } from '../repos';
import { ResponseMessage } from '../../../common/types';
import {
  CreatePost,
  StaffModerationPost,
  StaffPostUpdate,
  PaginatedResult,
  SortBy,
  EditUserPostStatus,
  PublicPostWithMainImage,
} from '../types';
import { Post, PostStatus, UserRoles } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException } from '../../../shared/errors/app-errors';
import { hasUpdatableFields } from '../../../common/utils';
import { IPostsService } from '../interfaces';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';
import { PostsQueueService } from '../queue';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { PostsCacheService } from './posts-cache.service';
import { QueueRetryHandlerService } from '../../queues/services';
import { AuthenticatedUser } from '../../../common/interfaces';

@Injectable()
export class PostsService implements IPostsService {
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly postsRepo: PostsRepo,
    private readonly postLikeRepo: PostsLikeRepo,
    private readonly postQueue: PostsQueueService,
    private readonly postsCacheService: PostsCacheService,
    private readonly queueRetryHandler: QueueRetryHandlerService,
  ) {}

  async create(authorId: string, data: CreatePost): Promise<Post> {
    const post = await this.postsRepo.create(authorId, data);

    if (data.isDraft === false) {
      await this.queueRetryHandler.runOrThrow(() => this.postQueue.assignReviewerToPost(post.id), {
        operation: 'posts-create-reviewer-assignment',
        metadata: {
          authorId,
          postId: post.id,
        },
      });
    }

    await this.postsCacheService.invalidatePostMutationCache([post.id]);

    return post;
  }

  async getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<PublicPostWithMainImage>> {
    const normalized = this.normalizeUserPostsQuery(query);
    const cached = await this.postsCacheService.getUserPosts<PaginatedResult<PublicPostWithMainImage>>(userId, normalized);
    if (cached) {
      return cached;
    }

    const result = await this.postsRepo.findByAuthorIdPaginated(userId, normalized);
    await this.postsCacheService.setUserPosts(userId, normalized, result);
    return result;
  }

  async getAllPublicPosts(query: PostsQueryDto): Promise<PaginatedResult<PublicPostWithMainImage>> {
    const normalized = this.normalizePublicQuery(query);
    const cached = await this.postsCacheService.getPublicPosts<PaginatedResult<PublicPostWithMainImage>>(normalized);
    if (cached) {
      return cached;
    }

    const result = await this.postsRepo.findManyPublic(normalized);
    await this.postsCacheService.setPublicPosts(normalized, result);
    return result;
  }

  async getAllStaffPosts(
    query: PostsStaffQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedResult<StaffModerationPost>> {
    const normalized = this.normalizeStaffQuery(query, currentUser);
    const cached = await this.postsCacheService.getStaffPosts<PaginatedResult<StaffModerationPost>>(normalized);
    if (cached) {
      return cached;
    }

    const result = await this.postsRepo.findManyStaff(normalized);
    await this.postsCacheService.setStaffPosts(normalized, result);
    return result;
  }

  async findById(id: number): Promise<Post> {
    const cached = await this.postsCacheService.getPostById<Post>(id);

    if (cached) {
      return cached;
    }

    const post = await this.postsRepo.getPostById(id);
    if (!post) {
      throw new AppNotFoundException('No posts found');
    }

    await this.postsCacheService.setPostById(id, post);
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

    await this.postsCacheService.invalidatePostMutationCache([postId]);

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

    await Promise.all(
      postIds.map((postId) =>
        this.queueRetryHandler.runOrThrow(() => this.postQueue.assignReviewerToPost(postId), {
          operation: 'posts-update-reviewer-assignment',
          metadata: {
            postId,
          },
        }),
      ),
    );

    await this.postsCacheService.invalidatePostMutationCache(postIds);

    return { message: 'Post updated successfully' };
  }

  async delete(postIds: number[], statusReason?: string): Promise<ResponseMessage> {
    const result = await this.postsRepo.delete(postIds, statusReason);
    if (result.count === 0) {
      throw new AppNotFoundException('No posts were deleted');
    }

    await this.postsCacheService.invalidatePostMutationCache(postIds);

    return { message: 'Post deleted successfully' };
  }

  async deleteManyByAdmin(postIds: number[], adminId: string): Promise<ResponseMessage> {
    const result = await this.postsRepo.deleteByAdmin(postIds);
    if (result.count === 0) {
      throw new AppNotFoundException('No posts were deleted');
    }

    await this.postsCacheService.invalidatePostMutationCache(postIds);

    this.logger.info(`Admin id: ${adminId} deleted posts ${postIds.join(', ')}`);
    return { message: 'Posts deleted successfully' };
  }

  async toggleLike(postId: number, userId: string): Promise<{ message: string; liked: boolean }> {
    await this.findById(postId);

    const like = await this.postLikeRepo.getLikeByUserPost(postId, userId);

    if (like) {
      await this.postLikeRepo.deleteLike(postId, userId);
      await this.postsCacheService.invalidateLikeRelatedCache(postId, userId);
      return { message: 'Like removed', liked: false };
    }

    await this.postLikeRepo.createLike(postId, userId);
    await this.postsCacheService.invalidateLikeRelatedCache(postId, userId);
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
      search: query.search,
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

  private normalizeStaffQuery(query: PostsStaffQueryDto, currentUser: AuthenticatedUser): NormalizedStaffQuery {
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
      status: query.status ?? PostStatus.PENDING_REVIEW,
      reviewerId: currentUser.role === UserRoles.MODERATOR ? currentUser.userId : undefined,
      sortBy,
      sortOrder,
    };
  }
}
