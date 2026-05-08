import { Inject, Injectable } from '@nestjs/common';
import { EmailTimeoutError, EmailSendFailedError } from '../errors';
import { IEmailProvider } from '../interfaces/email-provider';
import { EmailData } from '../types';
import { type EmailClient, EMAIL_CLIENT } from '../interfaces/email-client';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';
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
      const result = await executeWithRetry<boolean>(
        () => this.emailClient.send(emailData).then((value: unknown) => Boolean(value)),
        {
          maxRetries: this.MAX_RETRIES,
          timeoutMs: this.REQUEST_TIMEOUT,
          exponentialBackoff: true,
        },
      );

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Email send failed', {
        context: 'EmailsProviderService.sendEmail',
        error: errorMessage,
      });

      if (error instanceof RetryError && error.isTimeout) {
        throw new EmailTimeoutError(undefined, [error.message]);
      }

      throw new EmailSendFailedError(undefined, [errorMessage]);
    }
  }
}
