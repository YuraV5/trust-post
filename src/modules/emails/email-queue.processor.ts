import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { Inject } from '@nestjs/common';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { EmailsProviderService } from '../emails-provider/emails-provider.service';
import { resetPasswordEmailTemplate, verificationEmailPattern } from '../emails-provider/patterns';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { EmailVerificationTask, PasswordResetTask } from './types';

@Processor(EMAIL_NOTIFICATION_QUEUE, { limiter: { max: 20, duration: 1000 } }) // Limit to 20 jobs per second
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly emailProvider: EmailsProviderService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
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

  private async processSendPasswordResetEmail(job: Job) {
    const { data }: { data: PasswordResetTask } = job;
    this.logger.debug('Processing password reset email', { data });

    await this.emailProvider.sendEmail({
      to: data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Password Reset Email',
      html: resetPasswordEmailTemplate(data.passwordResetUrl), // You would define this template function similar to verificationEmailPattern
    });
    this.logger.info(`Password reset email sent to ${data.to}`);
  }
}
