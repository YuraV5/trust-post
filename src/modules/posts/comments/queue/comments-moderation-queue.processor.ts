import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { COMMENTS_MODERATION_JOB, COMMENTS_MODERATION_QUEUE } from '../consts';
import { CommentsModerationService } from '../moderation/comments-moderation.service';
import { ModerateCommentJobData } from './types/types';

@Processor(COMMENTS_MODERATION_QUEUE, { limiter: { max: 20, duration: 1000 } })
export class CommentsModerationQueueProcessor extends WorkerHost {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly moderationService: CommentsModerationService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<void> {
    switch (job.name as COMMENTS_MODERATION_JOB) {
      case COMMENTS_MODERATION_JOB.MODERATE_COMMENT:
        await this.handleModeration(job as Job<ModerateCommentJobData>);
        return;
      default:
        this.logger.warn(`No processor defined for job ${job.name}`);
    }
  }

  private async handleModeration(job: Job<ModerateCommentJobData>): Promise<void> {
    try {
      await this.moderationService.moderateAndApply(job.data, job.data.actionType);
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      const currentAttempt = (job.attemptsMade ?? 0) + 1;
      const isLastAttempt = currentAttempt >= maxAttempts;

      if (isLastAttempt) {
        await this.moderationService.markUnavailableAfterRetries(job.data, currentAttempt, error);
        return;
      }

      throw error;
    }
  }
}
