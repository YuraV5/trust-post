import { Inject, Injectable } from '@nestjs/common';
import { QueueRetryHandlerService } from '../../../queues/services';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { CommentsRepo } from '../repo';
import { CommentsModerationQueueService } from '../queue';

interface CommentModerationPayload {
  id: number;
  postId: number;
  content: string;
}

interface EnqueueContext {
  action: 'create' | 'update' | 'retry';
  adminId?: string;
  setProcessing: boolean;
}

@Injectable()
export class CommentsModerationRetryHandler {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly queueRetryHandler: QueueRetryHandlerService,
    private readonly commentsRepo: CommentsRepo,
    private readonly moderationQueue: CommentsModerationQueueService,
  ) {}

  async enqueueOrThrow(payload: CommentModerationPayload, context: EnqueueContext): Promise<void> {
    try {
      await this.queueRetryHandler.runOrThrow(
        () =>
          this.moderationQueue.enqueue({
            commentId: payload.id,
            postId: payload.postId,
            content: payload.content,
          }),
        {
          operation: `comments-moderation-${context.action}`,
          metadata: {
            commentId: payload.id,
            postId: payload.postId,
            adminId: context.adminId,
          },
        },
      );

      if (context.setProcessing) {
        await this.commentsRepo.setModerationProcessing(payload.id);
      }
    } catch (error) {
      await this.markFailedAfterEnqueueError(payload, context, error);
      throw error;
    }
  }

  private async markFailedAfterEnqueueError(
    payload: CommentModerationPayload,
    context: EnqueueContext,
    queueError: unknown,
  ): Promise<void> {
    try {
      await this.commentsRepo.markModerationServiceUnavailable(payload.id, 'queue enqueue failed');
    } catch (markError) {
      this.logger.error('Failed to mark comment as failed after enqueue error', {
        commentId: payload.id,
        postId: payload.postId,
        adminId: context.adminId,
        error: markError as Error,
      });
    }

    this.logger.error('Failed to enqueue comment moderation job', {
      action: context.action,
      commentId: payload.id,
      postId: payload.postId,
      adminId: context.adminId,
      error: queueError as Error,
    });
  }
}
