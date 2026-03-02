import { Injectable } from '@nestjs/common';
import { PostsRepo } from '../repos';
import { MessageResponse } from '../../../common/types';
import { CreatePost, StaffPostUpdate, PostLifecycleStatus, PaginatedResult, SortBy } from '../types';
import { Post } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-errors';
import { hasUpdatableFields } from '../../../common/utils';
import { IPostsService } from '../interfaces';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';

@Injectable()
export class PostsService implements IPostsService {
  private readonly MAX_LIMIT = 100;

  constructor(private readonly postsRepo: PostsRepo) {}

  async create(authorId: string, data: CreatePost): Promise<MessageResponse> {
    await this.postsRepo.create(authorId, data);
    return { message: 'Post created successfully' };
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
    const post = await this.postsRepo.findById(id);
    if (!post) {
      throw new NotFoundError('Post not found');
    }
    return post;
  }

  async update(postId: number, authorId: string, data: StaffPostUpdate): Promise<MessageResponse> {
    if (!hasUpdatableFields(data)) {
      throw new BadRequestError('At least one field must be provided for update');
    }
    await this.postsRepo.update([postId], data);
    return { message: 'Post updated successfully' };
  }

  async delete(postId: number, authorId: string): Promise<MessageResponse> {
    const result = await this.postsRepo.delete([postId]);
    if (result.count === 0) {
      throw new NotFoundError('Post not found');
    }
    return { message: 'Post deleted successfully' };
  }

  async updatePostStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<MessageResponse> {
    if (!hasUpdatableFields(data)) {
      throw new BadRequestError('At least one field must be provided for update');
    }
    await this.postsRepo.updateStatus(postId, reviewerId, data);
    return { message: 'Post status updated successfully' };
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
