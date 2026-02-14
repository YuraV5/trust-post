import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_NOTIFICATION_QUEUE, EMAIL_JOB } from './const';
import { Inject } from '@nestjs/common';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { EmailsProviderService } from '../emails-provider/emails-provider.service';
import { resetPasswordEmailTemplate, verificationEmailPattern } from '../emails-provider/patterns';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { EmailVerificationTask } from './types';

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

  private async processSendVerificationEmail(job: Job<EmailVerificationTask>) {
    // Simulate email sending logic here
    this.logger.debug('Processing verification email', { data: job.data });
    await this.emailProvider.sendEmail({
      to: job.data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Verification Email',
      html: verificationEmailPattern(job.data.verificationUrl, job.data.name), // You would define this template function to generate the email content
    });
    this.logger.info(`Verification email sent to ${job.data.to}`);
  }

  private async processSendPasswordResetEmail(job: Job) {
    // Simulate email sending logic here
    this.logger.debug('Processing password reset email', { data: job.data });
    await this.emailProvider.sendEmail({
      to: job.data.to,
      from: this.config.get<string>('email.from') || 'onboarding@resend.dev',
      subject: 'Password Reset Email',
      html: resetPasswordEmailTemplate(job.data.link), // You would define this template function similar to verificationEmailPattern
    });
    this.logger.info(`Password reset email sent to ${job.data.to}`);
  }
}
