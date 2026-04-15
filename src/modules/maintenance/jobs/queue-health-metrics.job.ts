import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MetricsService } from '../../../infrastructure/metrics/metrics.service';
import { PostsQueueService } from '../../posts/queue';
import { CommentsModerationQueueService } from '../../posts/comments/queue';
import { EmailQueueService } from '../../emails/email-queue.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class QueueHealthMetricsJob implements OnModuleInit {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly metricsService: MetricsService,
    private readonly postsQueueService: PostsQueueService,
    private readonly commentsQueueService: CommentsModerationQueueService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncQueueHealthMetrics();
  }

  // Refresh queue health metrics every minute for alerting and dashboards.
  @Cron('*/1 * * * *')
  async syncQueueHealthMetrics(): Promise<void> {
    const queueServices = [this.postsQueueService, this.commentsQueueService, this.emailQueueService];

    for (const queueService of queueServices) {
      try {
        const snapshot = await queueService.getHealthSnapshot();

        for (const [state, count] of Object.entries(snapshot.counts)) {
          this.metricsService.setQueueJobsCurrent(snapshot.queueName, state, count);
        }

        this.metricsService.setQueueDlqJobsCurrent(snapshot.queueName, snapshot.dlqCount);
        this.metricsService.setQueueFailedRetriedJobsCurrent(snapshot.queueName, snapshot.failedRetriedCount);
        this.metricsService.setQueueOldestWaitingJobAgeSeconds(snapshot.queueName, snapshot.oldestWaitingJobAgeSeconds);
      } catch (error) {
        this.logger.error('Failed to sync queue health metrics', {
          queueName: queueService.getQueueName(),
          error: error as Error,
        });
      }
    }
  }
}
