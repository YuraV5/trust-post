import { Inject } from '@nestjs/common';
import { IQueueService, QueueAddOptions } from './interfaces';
import { Queue } from 'bullmq';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { JobOptions } from './types';

export abstract class BaseQueueService implements IQueueService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly queue: Queue,
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

  // Add a job to the queue with the specified data and options
  async add<T>(data: T, { jobName, options }: QueueAddOptions): Promise<void> {
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
      this.logger.error(`Failed to add job "${jobName}" to queue`, {
        error: err as Error,
        jobName,
        queueName: this.queue.name,
      });

      throw err;
    }
  }

  // Get the name of the queue (useful for logging and debugging)
  getQueueName(): string {
    return this.queue.name;
  }
}
