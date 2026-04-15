import { Inject } from '@nestjs/common';
import { IQueueService } from './interfaces';
import { Job, Queue } from 'bullmq';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { JobOptions, QueueHealthSnapshot } from './types';
import { type IAppLogger } from '../../shared/logger/interfaces/interface';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

export abstract class BaseQueueService implements IQueueService {
  private dlqQueue?: Queue;

  constructor(
    @Inject(APP_LOGGER) protected readonly logger: IAppLogger,
    private readonly queue: Queue,
    private readonly metricsService?: MetricsService,
  ) {}

  /**
   * Default settings for all jobs in the queue
   *
   * attempts - number of retry attempts on failure (5 times)
   * backoff - delay between attempts (exponential backoff starting at 3 seconds)
   * removeOnComplete - remove job after successful completion
   * removeOnFail - keep the last 50 failed jobs for analysis
   */
  protected defaultOptions: JobOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: true,
    removeOnFail: 50,
  };

  protected readonly dlqOptions: JobOptions = {
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 1000,
    lifo: false,
  };

  // Build a queue-specific DLQ using the same Redis connection as the source queue.
  protected getDlqQueue(): Queue {
    if (!this.dlqQueue) {
      this.dlqQueue = new Queue(`${this.queue.name}.dlq`, {
        connection: this.queue.opts.connection,
        prefix: this.queue.opts.prefix,
      });
    }

    return this.dlqQueue;
  }

  // Add a job to the queue with the specified data and options
  async add<T>(jobName: string, data: T, options?: JobOptions): Promise<void> {
    try {
      // Check if the queue is available
      if (!this.queue) {
        this.logger.error('Queue is not initialized', {
          jobName,
        });
        throw new Error('Queue is not initialized');
      }

      // Check the validity of the data
      if (!data) {
        this.logger.debug('Attempting to add a job with empty data', {
          jobName,
          queueName: this.queue.name,
        });
        throw new Error('Job data cannot be empty');
      }

      // Combine default options with provided options
      const finalOptions = {
        ...this.defaultOptions,
        ...options,
      };

      // Add the job to the queue with the specified name and options
      await this.queue.add(jobName, data, finalOptions);

      // Logging success message with job and queue details
      this.logger.info(`Job "${jobName}" added to queue successfully`, {
        jobName,
        queueName: this.queue.name,
      });
    } catch (err: unknown) {
      const queueName = this.queue?.name ?? 'unknown';
      this.logger.error(`Failed to add job "${jobName}" to queue`, {
        error: err as Error,
        jobName,
        queueName,
      });

      throw err;
    }
  }

  // Get the name of the queue (useful for logging and debugging)
  getQueueName(): string {
    return this.queue.name;
  }

  async moveToDlq(job: Job<unknown>, error: unknown): Promise<void> {
    const dlq = this.getDlqQueue();
    const dlqJobName = `${job.name}.failed`;

    await dlq.add(
      dlqJobName,
      {
        sourceQueue: this.queue.name,
        sourceJobId: job.id,
        sourceJobName: job.name,
        sourceData: job.data,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        failedReason: error instanceof Error ? error.message : String(error),
        stacktrace: job.stacktrace,
        failedAt: new Date().toISOString(),
      },
      {
        ...this.dlqOptions,
        jobId: `${String(job.id ?? 'no-id')}-${Date.now()}`,
      },
    );

    this.metricsService?.recordQueueDlqEnqueue(this.queue.name, String(job.name));

    this.logger.warn('Job moved to DLQ after max retry attempts', {
      queueName: this.queue.name,
      dlqQueueName: dlq.name,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      error: error as Error,
    });
  }

  async getHealthSnapshot(): Promise<QueueHealthSnapshot> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
    const dlqCounts = await this.getDlqQueue().getJobCounts('waiting', 'delayed');

    // Keep the query cheap: inspect only the most recent 50 failed jobs.
    const failedJobs = await this.queue.getJobs(['failed'], 0, 49, false);
    const failedRetriedCount = failedJobs.filter((failedJob) => (failedJob.attemptsMade ?? 0) > 1).length;

    const waitingJobs = await this.queue.getJobs(['waiting'], 0, 0, true);
    const oldestWaitingTimestamp = waitingJobs[0]?.timestamp ?? 0;
    const oldestWaitingJobAgeSeconds = oldestWaitingTimestamp
      ? Math.max(0, Math.floor((Date.now() - oldestWaitingTimestamp) / 1000))
      : 0;

    return {
      queueName: this.queue.name,
      counts: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
        paused: counts.paused ?? 0,
      },
      dlqCount: (dlqCounts.waiting ?? 0) + (dlqCounts.delayed ?? 0),
      failedRetriedCount,
      oldestWaitingJobAgeSeconds,
    };
  }
}
