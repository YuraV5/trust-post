import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoreAgentsService } from '../../../core-agents/services';
import { AgentModerationResult, AgentProvider } from '../../../core-agents/types';
import { AppConfigException } from '../../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { CommentsRepo } from '../repo';
import { ModerateCommentJobData } from '../queue/types';

@Injectable()
export class CommentsModerationService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
    private readonly commentsRepo: CommentsRepo,
    private readonly coreAgentsService: CoreAgentsService,
  ) {}

  async moderateAndApply(data: ModerateCommentJobData): Promise<void> {
    const moderation = await this.requestModeration(data.content);

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

  private async requestModeration(content: string): Promise<AgentModerationResult> {
    const provider = this.resolveProvider();

    return this.coreAgentsService.getAgent(provider).commentModerate(content);
  }

  private resolveProvider(): AgentProvider {
    const provider = this.config.get<string>('commentModeration.provider')?.toLowerCase() || AgentProvider.Gemini;

    switch (provider as AgentProvider) {
      case AgentProvider.Gemini:
        return AgentProvider.Gemini;
      default:
        throw new AppConfigException(`Unsupported comment moderation provider: ${provider}`);
    }
  }
}
