import { Processor, WorkerHost } from '@nestjs/bullmq';
import { POSTS_JOB, POSTS_QUEUE } from '../consts';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { Inject } from '@nestjs/common/decorators/core/inject.decorator';
import { PostsReviewService } from '../services';
import { Job } from 'bullmq';
import { AssignReviewerJobData, ReassignDemotedModeratorPostsJobData } from '../types';
import { PostsQueueService } from './posts-queue.service';

@Processor(POSTS_QUEUE, { limiter: { max: 10, duration: 1000 } }) // Limit to 10 jobs per second to prevent overwhelming the system
export class PostsQueueProcessor extends WorkerHost {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly postReviewService: PostsReviewService,
    private readonly postsQueueService: PostsQueueService,
  ) {
    super();
  }
  async process(job: Job<unknown>): Promise<void> {
    try {
      switch (job.name as POSTS_JOB) {
        case POSTS_JOB.ASSIGN_REVIEWER:
          await this.handleAssignReviewer(job as Job<AssignReviewerJobData>);
          break;
        case POSTS_JOB.REASSIGN_DEMOTED_MODERATOR_POSTS:
          await this.handleReassignDemotedModeratorPosts(job as Job<ReassignDemotedModeratorPostsJobData>);
          break;
        default:
          throw new Error(`No processor defined for job ${job.name}`);
      }
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      const currentAttempt = (job.attemptsMade ?? 0) + 1;
      const isLastAttempt = currentAttempt >= maxAttempts;

      if (isLastAttempt) {
        await this.postsQueueService.moveToDlq(job, error);
      }

      this.logger.error('Posts queue job processing failed', {
        jobId: job.id,
        jobName: job.name,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error as Error,
      });

      throw error;
    }
  }

  private async handleAssignReviewer(job: Job<AssignReviewerJobData>) {
    const { data } = job;
    this.logger.debug('Processing assign reviewer job', { postId: data.postId });
    try {
      await this.postReviewService.assignReviewer(data.postId);
    } catch (error) {
      this.logger.error('Failed to assign reviewer', { error: error as Error, postId: data.postId });
      throw error;
    }
  }

  private async handleReassignDemotedModeratorPosts(job: Job<ReassignDemotedModeratorPostsJobData>): Promise<void> {
    const { data } = job;
    this.logger.debug('Processing demoted moderator posts reassignment job', {
      demotedModeratorId: data.demotedModeratorId,
      changedById: data.changedById,
    });

    try {
      await this.postReviewService.reassignPostsFromDemotedModerator(data.demotedModeratorId, data.changedById);
    } catch (error) {
      this.logger.error('Failed to reassign posts for demoted moderator', {
        error: error as Error,
        demotedModeratorId: data.demotedModeratorId,
        changedById: data.changedById,
      });
      throw error;
    }
  }
}
