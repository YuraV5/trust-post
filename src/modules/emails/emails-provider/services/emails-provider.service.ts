import { Inject, Injectable } from '@nestjs/common';
import { EmailTimeoutError, EmailSendFailedError } from '../errors';
import { IEmailProvider } from '../interfaces/email-provider';
import { EmailData } from '../types';
import { type EmailClient, EMAIL_CLIENT } from '../interfaces/email-client';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { executeWithRetry, RetryError } from '../../../../common/utils';

@Injectable()
export class EmailsProviderService implements IEmailProvider {
  private readonly REQUEST_TIMEOUT = 30000;
  private readonly MAX_RETRIES = 3;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const result = await executeWithRetry(() => this.emailClient.send(emailData), {
        maxRetries: this.MAX_RETRIES,
        timeoutMs: this.REQUEST_TIMEOUT,
        exponentialBackoff: true,
      });

      return !!result;
    } catch (error) {
      this.logger.error('Email send failed', {
        context: 'EmailsProviderService.sendEmail',
        error: error instanceof Error ? error.message : error,
      });

      if (error instanceof RetryError && error.isTimeout) {
        throw new EmailTimeoutError(undefined, [error.message]);
      }

      throw new EmailSendFailedError(undefined, [(error as Error).message]);
    }
  }
}
