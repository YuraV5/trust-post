import { Inject, Injectable } from '@nestjs/common';
import { CoreAgentsService } from '../../../core-agents/services';
import { AgentModerationResult } from '../../../core-agents/types';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';
import { CommentsRepo } from '../repo';
import { AgentActionSelector } from '../../../core-agents/consts';
import { ModerateCommentJobData } from '../queue/types/types';

@Injectable()
export class CommentsModerationService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly commentsRepo: CommentsRepo,
    private readonly coreAgentsService: CoreAgentsService,
  ) {}

  async moderateAndApply(data: ModerateCommentJobData, actionType: AgentActionSelector): Promise<void> {
    const moderation = await this.requestModeration(data.content, actionType);

    if (moderation.isSafe) {
      await this.commentsRepo.markModeratedApproved(data.commentId, {
        provider: moderation.provider,
        score: moderation.score,
      });

      return;
    }

    await this.commentsRepo.markModeratedRejected(data.commentId, {
      provider: moderation.provider,
      score: moderation.score,
      reason: moderation.reason ?? 'Comment failed moderation checks',
    });
  }

  async markUnavailableAfterRetries(data: ModerateCommentJobData, attempts: number, error: unknown): Promise<void> {
    const reason = 'service does not respond';

    await this.commentsRepo.markModerationServiceUnavailable(data.commentId, reason);

    this.logger.error('Comment moderation service unavailable after retries', {
      commentId: data.commentId,
      postId: data.postId,
      attempts,
      error: error as Error,
    });
  }

  private async requestModeration(content: string, actionType: AgentActionSelector): Promise<AgentModerationResult> {
    return this.coreAgentsService.commentModerate(content, actionType);
  }
}
