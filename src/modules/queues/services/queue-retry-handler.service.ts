import { Inject, Injectable } from '@nestjs/common';
import { executeWithRetry } from '../../../common/utils';
import { AppServiceUnavailableException } from '../../../shared/errors/app-errors';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';

interface QueueRetryContext {
  operation: string;
  metadata?: Record<string, unknown>;
  maxRetries?: number;
}

@Injectable()
export class QueueRetryHandlerService {
  constructor(@Inject(APP_LOGGER) private readonly logger: IAppLogger) {}

  async runOrThrow(action: () => Promise<void>, context: QueueRetryContext): Promise<void> {
    try {
      await executeWithRetry(() => action(), {
        maxRetries: context.maxRetries ?? 2,
        timeoutMs: 5000,
        retryTimeouts: true,
        retryableMessages: ['timeout', 'aborted', 'econnrefused', 'enotfound', 'redis', 'queue'],
      });
    } catch (error) {
      this.logger.error('Queue operation failed after retries', {
        operation: context.operation,
        error: error as Error,
        metadata: context.metadata,
      });

      throw new AppServiceUnavailableException('Queue service is temporarily unavailable', [context.operation]);
    }
  }
}
