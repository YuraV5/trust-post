import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseQueueService } from '../queues/base-queue.service';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { EMAIL_JOB_OPTIONS } from './configs';
import { AccountActivationTask, EmailVerificationTask, PasswordResetTask } from './types';
import { type IAppLogger } from '../../shared/logger/interfaces/interface';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

@Injectable()
export class EmailQueueService extends BaseQueueService {
  constructor(
    @Inject(APP_LOGGER) logger: IAppLogger,
    @InjectQueue(EMAIL_NOTIFICATION_QUEUE) queue: Queue,
    metricsService: MetricsService,
  ) {
    super(logger, queue, metricsService);
  }

  async sendVerificationEmail(data: EmailVerificationTask): Promise<void> {
    return this.add<EmailVerificationTask>(
      EMAIL_JOB.VERIFICATION_EMAIL,
      {
        to: data.to,
        name: data.name,
        verificationUrl: data.verificationUrl, // verification link
      },
      { ...EMAIL_JOB_OPTIONS, jobId: `${EMAIL_JOB.VERIFICATION_EMAIL}-${data.to}`, priority: 1 }, // High priority
    );
  }

  async sendPasswordResetEmail(data: PasswordResetTask): Promise<void> {
    return this.add<PasswordResetTask>(
      EMAIL_JOB.PASSWORD_RESET_EMAIL,
      {
        to: data.to,
        passwordResetUrl: data.passwordResetUrl, // password reset link
      },
      { ...EMAIL_JOB_OPTIONS, jobId: `${EMAIL_JOB.PASSWORD_RESET_EMAIL}-${data.to}`, priority: 1 }, // High priority
    );
  }

  async sendAccountActivationEmail(data: AccountActivationTask): Promise<void> {
    return this.add(
      EMAIL_JOB.ACCOUNT_ACTIVATION_EMAIL,
      {
        to: data.to,
        activationUrl: data.activationUrl, // account activation link
      },
      { ...EMAIL_JOB_OPTIONS, jobId: `${EMAIL_JOB.ACCOUNT_ACTIVATION_EMAIL}-${data.to}`, priority: 1 }, // High priority
    );
  }

  async enqueuePostRejectedEmail(to: string, data: { postTitle: string; reason: string }): Promise<void> {
    return this.add(
      EMAIL_JOB.REJECT_POST_EMAIL,
      {
        to,
        postTitle: data.postTitle,
        reason: data.reason,
      },
      { ...EMAIL_JOB_OPTIONS, jobId: `${EMAIL_JOB.REJECT_POST_EMAIL}-${to}`, priority: 2 }, // High priority
    );
  }
}
