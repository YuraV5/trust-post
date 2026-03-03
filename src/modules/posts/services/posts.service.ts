import { Inject, Injectable } from '@nestjs/common';
import { PostsLikeRepo, PostsRepo } from '../repos';
import { MessageResponse } from '../../../common/types';
import { CreatePost, StaffPostUpdate, PaginatedResult, SortBy, EditUserPostStatus } from '../types';
import { Post } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-errors';
import { hasUpdatableFields } from '../../../common/utils';
import { IPostsService } from '../interfaces';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';
import { PostsQueueService } from '../queue';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

@Injectable()
export class PostsService implements IPostsService {
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly postsRepo: PostsRepo,
    private readonly postLikeRepo: PostsLikeRepo,
    private readonly postQueue: PostsQueueService,
  ) {}

  async create(authorId: string, data: CreatePost): Promise<Post> {
    const post = await this.postsRepo.create(authorId, data);
    try {
      await this.postQueue.assignReviewerToPost(post.id);
    } catch (error) {
      this.logger.error('Error creating post', { authorId, error: error as Error });
    }
    return post;
  }

  async getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<Post>> {
    const normalized = this.normalizeUserPostsQuery(query);
    return await this.postsRepo.findByAuthorIdPaginated(userId, normalized);
  }

  async getAllPublicPosts(query: PostsQueryDto): Promise<PaginatedResult<Post>> {
    const normalized = this.normalizePublicQuery(query);
    return await this.postsRepo.findManyPublic(normalized);
  }

  async getAllStaffPosts(query: PostsStaffQueryDto): Promise<PaginatedResult<Post>> {
    const normalized = this.normalizeStaffQuery(query);
    return await this.postsRepo.findManyStaff(normalized);
  }

  async findById(id: number): Promise<Post> {
    const post = await this.postsRepo.getPostById(id);
    if (!post) {
      throw new NotFoundError('No posts found');
    }
    return post;
  }

  async editUserPostStatus(postId: number, data: EditUserPostStatus): Promise<MessageResponse> {
    const result = await this.postsRepo.updateStatus(postId, {
      postStatus: data.status,
      statusReason: data.statusReason,
    });
    if (!result) {
      throw new NotFoundError('No posts were updated');
    }
    return { message: 'Post status updated successfully' };
  }

  async update(postIds: number[], authorId: string, data: StaffPostUpdate): Promise<MessageResponse> {
    if (!hasUpdatableFields(data)) {
      throw new BadRequestError('At least one field must be provided for update');
    }

    const result = await this.postsRepo.update(postIds, data);

    if (result.count === 0) {
      throw new NotFoundError('No posts were updated');
    }

    // Fire-and-log queue operations safely
    const queueResults = await Promise.allSettled(postIds.map((postId) => this.postQueue.assignReviewerToPost(postId)));

    // Log failed queue jobs but do not fail request
    queueResults.forEach((res, index) => {
      if (res.status === 'rejected') {
        this.logger.error('Failed to enqueue reviewer assignment', {
          postId: postIds[index],
          authorId,
          error: res.reason,
        });
      }
    });

    return { message: 'Post updated successfully' };
  }

  async delete(postIds: number[], statusReason?: string): Promise<MessageResponse> {
    const result = await this.postsRepo.delete(postIds, statusReason);
    if (result.count === 0) {
      throw new NotFoundError('No posts were deleted');
    }
    return { message: 'Post deleted successfully' };
  }

  async deleteManyByAdmin(postIds: number[], adminId: string): Promise<MessageResponse> {
    const result = await this.postsRepo.deleteByAdmin(postIds);
    if (result.count === 0) {
      throw new NotFoundError('No posts were deleted');
    }

    this.logger.info(`Admin id: ${adminId} deleted posts ${postIds.join(', ')}`);
    return { message: 'Posts deleted successfully' };
  }

  async toggleLike(postId: number, userId: string): Promise<{ message: string; liked: boolean }> {
    await this.findById(postId);

    const like = await this.postLikeRepo.getLikeByUserPost(postId, userId);

    if (like) {
      await this.postLikeRepo.deleteLike(postId, userId);
      return { message: 'Like removed', liked: false };
    }

    await this.postLikeRepo.createLike(postId, userId);
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
}
