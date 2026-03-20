import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { Inject } from '@nestjs/common';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import {
  accountActivationEmailPattern,
  rejectPostEmailTemplate,
  resetPasswordEmailTemplate,
  verificationEmailPattern,
} from './patterns';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { AccountActivationTask, EmailVerificationTask, PasswordResetTask, RejectPostEmailTask } from './types';
import { type IAppLogger } from '../../shared/logger/intefaces/interface';
import { EmailsProviderService } from './emails-provider/services';

@Processor(EMAIL_NOTIFICATION_QUEUE, { limiter: { max: 20, duration: 1000 } }) // Limit to 20 jobs per second
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly emailProvider: EmailsProviderService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<void> {
    try {
      switch (job.name as EMAIL_JOB) {
        case EMAIL_JOB.VERIFICATION_EMAIL:
          await this.processSendVerificationEmail(job as Job<EmailVerificationTask>);
          break;
        case EMAIL_JOB.PASSWORD_RESET_EMAIL:
          await this.processSendPasswordResetEmail(job as Job<PasswordResetTask>);
          break;
        case EMAIL_JOB.ACCOUNT_ACTIVATION_EMAIL:
          await this.processSendAccountActivationEmail(job as Job<AccountActivationTask>);
          break;
        case EMAIL_JOB.REJECT_POST_EMAIL:
          await this.processSendRejectPostEmail(job as Job<RejectPostEmailTask>);
          break;
        default:
          throw new Error(`No processor defined for job ${job.name}`);
      }
    } catch (error) {
      this.logger.error('Email queue job processing failed', {
        jobId: job.id,
        jobName: job.name,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error as Error,
      });

      throw error;
    }
  }

  private async processSendVerificationEmail(job: Job<EmailVerificationTask>) {
    const { data }: { data: EmailVerificationTask } = job;
    this.logger.debug('Processing verification email', { data });

    await this.emailProvider.sendEmail({
      to: data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Verification Email',
      html: verificationEmailPattern(data.verificationUrl, data.name), // You would define this template function to generate the email content
    });
    this.logger.info(`Verification email sent to ${data.to}`);
  }

  private async processSendPasswordResetEmail(job: Job<PasswordResetTask>) {
    const { data } = job;
    this.logger.debug('Processing password reset email', { data });

    await this.emailProvider.sendEmail({
      to: data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Password Reset Email',
      html: resetPasswordEmailTemplate(data.passwordResetUrl), // You would define this template function similar to verificationEmailPattern
    });
    this.logger.info(`Password reset email sent to ${data.to}`);
  }

  private async processSendAccountActivationEmail(job: Job<AccountActivationTask>) {
    const { data } = job;
    this.logger.debug('Processing account activation email', { data });

    await this.emailProvider.sendEmail({
      to: data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Account Activation Email',
      html: accountActivationEmailPattern(data.activationUrl), // You would define this template function similar to verificationEmailPattern
    });
    this.logger.debug(`Account activation email sent to ${data.to}`);
  }

  private async processSendRejectPostEmail(job: Job<RejectPostEmailTask>) {
    const { data } = job;
    this.logger.debug('Processing post rejection email', { data });

    await this.emailProvider.sendEmail({
      to: data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Post Review',
      html: rejectPostEmailTemplate(data.postTitle, data.reason), // You would define this template function similar to verificationEmailPattern
    });
    this.logger.info(`Post rejection email sent to ${data.to}`);
  }
}
