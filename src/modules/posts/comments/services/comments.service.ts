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
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { CommentsModerationQueueService } from '../queue';
import { TokensService } from '../../../security/services';

@Injectable()
export class CommentsService implements ICommentsService {
  private readonly MAX_LIMIT = 100;
  private readonly RETRY_BATCH_SIZE = 25;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly commentsRepo: CommentsRepo,
    private readonly commentLikesRepo: CommentLikeRepo,
    private readonly moderationQueue: CommentsModerationQueueService,
    private readonly tokensService: TokensService,
  ) {}

  async create(postId: number, authorId: string, data: CreateCommentInput): Promise<ResponseMessage> {
    const comment = await this.commentsRepo.create(authorId, {
      postId,
      content: data.content,
    });

    this.moderationQueue
      .enqueue({ commentId: comment.id, postId, content: comment.content })
      .then(() => this.commentsRepo.setModerationProcessing(comment.id))
      .catch((error) => {
        this.logger.error('Failed to enqueue comment moderation job after creation', {
          commentId: comment.id,
          postId,
          error: error as Error,
        });
      });

    this.logger.info(`Comment created by user ${authorId} on post ${postId}`, { commentId: comment.id });

    return { message: 'Comment created successfully' };
  }

  async getCommentsByPostId(
    postId: number,
    query: CommentsQueryDto,
    viewerId?: string,
  ): Promise<PaginatedResult<Comment>> {
    const normalized = this.normalizeQuery(query);
    return await this.commentsRepo.findByPostIdPaginated(postId, normalized, viewerId);
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
      this.moderationQueue
        .enqueue({ commentId: updatedComment.id, postId: updatedComment.postId, content: updatedComment.content })
        .then(() => this.commentsRepo.setModerationProcessing(updatedComment.id))
        .catch((error) => {
          this.logger.error('Failed to enqueue comment moderation job after update', {
            commentId: updatedComment.id,
            postId: updatedComment.postId,
            error: error as Error,
          });
        });
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

        this.moderationQueue
          .enqueue({
            commentId: comment.id,
            postId: comment.postId,
            content: comment.content,
          })
          .catch((error) => {
            this.logger.error('Failed to enqueue comment moderation retry job', {
              adminId,
              commentId: comment.id,
              postId: comment.postId,
              error: error as Error,
            });
          });

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
