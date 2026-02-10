import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseQueueService } from './base-queue.service';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { QUEUE_NAME } from './const';
import { EmailJobData } from './types';

@Injectable()
export class EmailQueueService extends BaseQueueService {
  constructor(@Inject(APP_LOGGER) logger: AppLogger, @InjectQueue(QUEUE_NAME.EMAIL) queue: Queue) {
    super(logger, queue);
  }

  async sendVerificationEmail(to: string, userName: string): Promise<void> {
    return this.add<EmailJobData>(
      {
        to,
        subject: 'Verification Email',
        template: 'verification-email',
        context: { userName },
      },
      { jobName: 'send-verification-email', options: { priority: 5 } }, // Medium priority
    );
  }

  async sendPasswordResetEmail(to: string, resetToken: string, resetLink: string): Promise<void> {
    return this.add<EmailJobData>(
      {
        to,
        subject: 'Password Reset Request',
        template: 'password-reset',
        context: { resetToken, resetLink },
      },
      { jobName: 'send-password-reset-email', options: { priority: 2 } }, // High priority
    );
  }
}
