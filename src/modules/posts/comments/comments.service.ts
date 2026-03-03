import { Inject, Injectable } from '@nestjs/common';
import { CommentsRepo, LikeRepo } from './repo';
import { MessageResponse } from '../../../common/types';
import { CreateCommentInput, UpdateCommentInput, PaginatedResult, NormalizedCommentsQuery } from './types';
import { Comment } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException, AppForbiddenException } from '../../../shared/errors/app-errors';
import { ICommentsService } from './interfaces';
import { CommentsQueryDto } from './dtos';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

@Injectable()
export class CommentsService implements ICommentsService {
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly commentsRepo: CommentsRepo,
    private readonly likeRepo: LikeRepo,
  ) {}

  async create(postId: number, authorId: string, data: CreateCommentInput): Promise<MessageResponse> {
    const comment = await this.commentsRepo.create(authorId, {
      postId,
      content: data.content,
    });

    this.logger.info(`Comment created by user ${authorId} on post ${postId}`, { commentId: comment.id });

    return { message: 'Comment created successfully' };
  }

  async getCommentsByPostId(postId: number, query: CommentsQueryDto): Promise<PaginatedResult<Comment>> {
    const normalized = this.normalizeQuery(query);
    return await this.commentsRepo.findByPostIdPaginated(postId, normalized);
  }

  async update(id: number, authorId: string, data: UpdateCommentInput): Promise<MessageResponse> {
    if (!data.content?.trim()) {
      throw new AppBadRequestException('Content cannot be empty');
    }

    const comment = await this.commentsRepo.getById(id);
    if (!comment) {
      throw new AppNotFoundException('Comment not found');
    }

    if (comment.authorId !== authorId) {
      throw new AppForbiddenException('You can only edit your own comments');
    }

    await this.commentsRepo.update(id, data);

    this.logger.info(`Comment ${id} updated by user ${authorId}`);

    return { message: 'Comment updated successfully' };
  }

  async delete(id: number, authorId: string): Promise<MessageResponse> {
    const comment = await this.commentsRepo.getById(id);
    if (!comment) {
      throw new AppNotFoundException('Comment not found');
    }

    if (comment.authorId !== authorId) {
      throw new AppForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepo.delete(id);

    this.logger.info(`Comment ${id} deleted by user ${authorId}`);

    return { message: 'Comment deleted successfully' };
  }

  async deleteByModerator(ids: number[]): Promise<MessageResponse> {
    if (!ids || ids.length === 0) {
      throw new AppBadRequestException('At least one comment ID must be provided');
    }

    const result = await this.commentsRepo.hardDeleteMany(ids);

    if (result.count === 0) {
      throw new AppNotFoundException('No comments were deleted');
    }

    this.logger.info(`${result.count} comment(s) permanently deleted by moderator`, { deletedIds: ids });

    return { message: `${result.count} comment(s) deleted successfully` };
  }

  // Like/unlike a comment
  async toggleLike(commentId: number, userId: string): Promise<{ message: string; liked: boolean }> {
    const like = await this.likeRepo.getLikeByUserComment(commentId, userId);
    if (like) {
      await this.likeRepo.deleteLike(commentId, userId);
      return { message: 'Like removed', liked: false };
    } else {
      await this.likeRepo.createLike(commentId, userId);
      return { message: 'Like added', liked: true };
    }
  }

  private normalizeQuery(query: CommentsQueryDto): NormalizedCommentsQuery {
    const VALID_SORT_FIELDS = ['createdAt', 'updatedAt'];

    const limit = Math.min(Math.max(query.limit || 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page || 1, 1);
    const sortBy = VALID_SORT_FIELDS.includes(query.sortBy as string)
      ? (query.sortBy as 'createdAt' | 'updatedAt')
      : 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return {
      page,
      limit,
      sortBy,
      sortOrder,
    };
  }
}
