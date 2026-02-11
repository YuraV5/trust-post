import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { Inject } from '@nestjs/common';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';

@Processor(EMAIL_NOTIFICATION_QUEUE, { limiter: { max: 20, duration: 1000 } }) // Limit to 20 jobs per second
export class EmailProcessor extends WorkerHost {
  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.info(`Processing job ${job.name} with data: ${JSON.stringify(job.data)}`);

    switch (job.name as EMAIL_JOB) {
      case EMAIL_JOB.VERIFICATION_EMAIL:
        await this.processSendVerificationEmail(job);
        break;
      case EMAIL_JOB.PASSWORD_RESET_EMAIL:
        await this.processSendPasswordResetEmail(job);
        break;
      default:
        this.logger.warn(`No processor defined for job ${job.name}`);
    }
  }

  private async processSendVerificationEmail(job: Job) {
    this.logger.debug('Processing verification email', { data: job.data });

    await new Promise((r) => setTimeout(r, 1000));
  }

  private async processSendPasswordResetEmail(job: Job) {
    // Simulate email sending logic here
    this.logger.debug('Processing password reset email', { data: job.data });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async work
  }
}
