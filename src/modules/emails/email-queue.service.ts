import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../queues/base-queue.service';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { EmailJobData } from './types';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { VERIFY_EMAIL_JOB_OPTIONS } from './configs';

@Injectable()
export class EmailQueueService extends BaseQueueService {
  constructor(@Inject(APP_LOGGER) logger: AppLogger, @InjectQueue(EMAIL_NOTIFICATION_QUEUE) queue: Queue) {
    super(logger, queue);
  }

  async sendVerificationEmail(to: string, userName: string): Promise<void> {
    // TODO improve type and add validation
    return this.add<EmailJobData>(
      EMAIL_JOB.VERIFICATION_EMAIL,
      {
        to,
        subject: 'Verification Email',
        template: 'verification-email',
        context: { userName },
      },
      { ...VERIFY_EMAIL_JOB_OPTIONS, jobId: `verification-email-${to}`, priority: 5 }, // Medium priority
    );
  }

  async sendPasswordResetEmail(to: string, resetToken: string, resetLink: string): Promise<void> {
    // TODO improve type and add validation
    return this.add<EmailJobData>(
      EMAIL_JOB.PASSWORD_RESET_EMAIL,
      {
        to,
        subject: 'Password Reset Request',
        template: 'password-reset',
        context: { resetToken, resetLink },
      },
      { ...VERIFY_EMAIL_JOB_OPTIONS, jobId: `reset-password-${to}`, priority: 2 }, // High priority
    );
  }
}
