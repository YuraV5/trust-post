import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailTimeoutError, EmailSendFailedError, InvalidEmailConfigError } from './errors';
import { IEmailProvider } from './interfaces/email-provider';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { executeWithRetry, RetryError } from '../../common/utils/retry.util';
import { EmailData } from './types';

@Injectable()
export class EmailsProviderService implements IEmailProvider {
  private resendClient: Resend;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly config: ConfigService,
  ) {}

  private getClient(): Resend {
    if (!this.resendClient) {
      const apiKey = this.config.get<string>('email.resendApiKey');
      if (!apiKey) {
        this.logger.error('Missing Resend API key');
        throw new InvalidEmailConfigError(undefined, ['Resend API key is not configured']);
      }
      this.resendClient = new Resend(apiKey);
    }
    return this.resendClient;
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const result = await executeWithRetry(() => this.getClient().emails.send(emailData), {
        maxRetries: this.MAX_RETRIES,
        timeoutMs: this.REQUEST_TIMEOUT,
        exponentialBackoff: true,
      });
      return !!result;
    } catch (error) {
      this.logger.error('Email send failed', { error: error instanceof Error ? error.message : error });

      if (error instanceof RetryError && error.isTimeout) {
        throw new EmailTimeoutError(undefined, [error.message]);
      }

      throw new EmailSendFailedError(undefined, [(error as Error).message]);
    }
  }
}
