import { Inject, Injectable } from '@nestjs/common';
import { CommentsRepo, CommentLikeRepo } from '../repo';
import { ResponseMessage } from '../../../../common/types';
import {
  CreateCommentInput,
  UpdateCommentInput,
  PaginatedResult,
  NormalizedCommentsQuery,
  RetryFailedCommentsInput,
  RetryFailedCommentsResult,
  RetryFailedCommentCandidate,
} from '../types';
import { Comment } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException } from '../../../../shared/errors/app-errors';
import { ICommentsService } from '../interfaces';
import { CommentsQueryDto } from '../dtos';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';
import { TokensService } from '../../../security/services';
import { CommentsCacheService } from './comments-cache.service';
import { CommentsModerationRetryHandler } from './comments-moderation-retry.handler';

@Injectable()
export class CommentsService implements ICommentsService {
  private readonly MAX_LIMIT = 100;
  private readonly RETRY_BATCH_SIZE = 25;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly commentsRepo: CommentsRepo,
    private readonly commentLikesRepo: CommentLikeRepo,
    private readonly moderationRetryHandler: CommentsModerationRetryHandler,
    private readonly tokensService: TokensService,
    private readonly commentsCacheService: CommentsCacheService,
  ) {}

  async create(postId: number, authorId: string, data: CreateCommentInput): Promise<ResponseMessage> {
    const comment = await this.commentsRepo.create(authorId, {
      postId,
      content: data.content,
    });

    await this.moderationRetryHandler.enqueueOrThrow(
      {
        id: comment.id,
        postId,
        content: comment.content,
      },
      {
        action: 'create',
        setProcessing: true,
      },
    );

    this.logger.info(`Comment created by user ${authorId} on post ${postId}`, { commentId: comment.id });

    return { message: 'Comment created successfully' };
  }

  async getCommentsByPostId(
    postId: number,
    query: CommentsQueryDto,
    viewerId?: string,
  ): Promise<PaginatedResult<Comment>> {
    const normalized = this.normalizeQuery(query);
    const cached = await this.commentsCacheService.getByPostQuery<PaginatedResult<Comment>>(
      postId,
      normalized,
      viewerId,
    );
    if (cached) {
      return cached;
    }

    const result = await this.commentsRepo.findByPostIdPaginated(postId, normalized, viewerId);
    await this.commentsCacheService.setByPostQuery(postId, normalized, result, viewerId);
    return result;
  }

  async update(id: number, data: UpdateCommentInput): Promise<ResponseMessage> {
    if (!data.content?.trim()) {
      throw new AppBadRequestException('Content cannot be empty');
    }

    const comment = await this.commentsRepo.getById(id);
    if (!comment) {
      throw new AppNotFoundException('Comment not found');
    }

    const updatedComment = await this.commentsRepo.update(id, data);
    this.logger.info(`Comment ${id} updated`);

    if (updatedComment?.id) {
      await this.moderationRetryHandler.enqueueOrThrow(
        {
          id: updatedComment.id,
          postId: updatedComment.postId,
          content: updatedComment.content,
        },
        {
          action: 'update',
          setProcessing: true,
        },
      );
    }

    return { message: 'Comment updated successfully' };
  }

  async delete(id: number): Promise<ResponseMessage> {
    const comment = await this.commentsRepo.getById(id);
    if (!comment) {
      throw new AppNotFoundException('Comment not found');
    }

    await this.commentsRepo.delete(id);

    this.logger.info(`Comment ${id} deleted`);

    return { message: 'Comment deleted successfully' };
  }

  async deleteByModerator(ids: number[]): Promise<ResponseMessage> {
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

  async retryFailedModerationByAdmin(
    params: RetryFailedCommentsInput,
    adminId: string,
  ): Promise<RetryFailedCommentsResult> {
    const startedAt = new Date();
    const limit = Math.min(Math.max(params.limit ?? 100, 1), this.MAX_LIMIT);

    const candidates = await this.commentsRepo.findFailedForRetry({
      postId: params.postId,
      authorId: params.authorId,
      limit,
    });

    let queuedCount = 0;

    for (const batch of this.chunkCandidates(candidates, this.RETRY_BATCH_SIZE)) {
      for (const comment of batch) {
        const movedToProcessing = await this.commentsRepo.setModerationProcessingIfFailed(comment.id);
        if (!movedToProcessing) {
          continue;
        }

        await this.moderationRetryHandler.enqueueOrThrow(
          {
            id: comment.id,
            postId: comment.postId,
            content: comment.content,
          },
          {
            action: 'retry',
            adminId,
            setProcessing: false,
          },
        );

        queuedCount += 1;
      }
    }

    this.logger.info('Admin started retry for failed comments moderation', {
      adminId,
      startedAt: startedAt.toISOString(),
      queuedCount,
      requestedLimit: params.limit,
      appliedLimit: limit,
      filters: {
        postId: params.postId,
        authorId: params.authorId,
      },
    });

    return { queuedCount };
  }

  // Like/unlike a comment
  async toggleLike(commentId: number, userId: string): Promise<{ message: string; liked: boolean }> {
    const like = await this.commentLikesRepo.getLikeByUserComment(commentId, userId);
    if (like) {
      await this.commentLikesRepo.deleteLike(commentId, userId);
      return { message: 'Like removed', liked: false };
    } else {
      await this.commentLikesRepo.createLike(commentId, userId);
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

  async resolveViewerId(authorization?: string): Promise<string | undefined> {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const payload = await this.tokensService.verifyAccess(authorization.slice('Bearer '.length));
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  private chunkCandidates(
    candidates: RetryFailedCommentCandidate[],
    chunkSize: number,
  ): RetryFailedCommentCandidate[][] {
    const chunks: RetryFailedCommentCandidate[][] = [];

    for (let i = 0; i < candidates.length; i += chunkSize) {
      chunks.push(candidates.slice(i, i + chunkSize));
    }

    return chunks;
  }
}
