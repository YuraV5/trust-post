import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../queues/base-queue.service';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { VERIFY_EMAIL_JOB_OPTIONS } from './configs';
import { EmailVerificationTask, PasswordResetTask } from './types';

@Injectable()
export class EmailQueueService extends BaseQueueService {
  constructor(@Inject(APP_LOGGER) logger: AppLogger, @InjectQueue(EMAIL_NOTIFICATION_QUEUE) queue: Queue) {
    super(logger, queue);
  }

  async sendVerificationEmail(data: EmailVerificationTask): Promise<void> {
    // TODO improve type and add validation
    return this.add<EmailVerificationTask>(
      EMAIL_JOB.VERIFICATION_EMAIL,
      {
        to: data.to,
        name: data.name,
        verificationUrl: data.verificationUrl, // verification link
      },
      { ...VERIFY_EMAIL_JOB_OPTIONS, jobId: `verification-email-${data.to}`, priority: 2 }, // High priority
    );
  }

  async sendPasswordResetEmail(data: PasswordResetTask): Promise<void> {
    // TODO improve type and add validation
    return this.add<PasswordResetTask>(
      EMAIL_JOB.PASSWORD_RESET_EMAIL,
      {
        to: data.to,
        passwordResetUrl: data.passwordResetUrl, // password reset link
      },
      { ...VERIFY_EMAIL_JOB_OPTIONS, jobId: `reset-password-${data.to}`, priority: 2 }, // High priority
    );
  }
}
