export interface RetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  exponentialBackoff?: boolean;
  retryTimeouts?: boolean;
  retryableStatuses?: number[];
  retryableMessages?: string[];
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly originalError: unknown,
    public readonly isTimeout: boolean = false,
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  timeoutMs: 30000,
  exponentialBackoff: true,
  retryTimeouts: false,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableMessages: ['timeout', 'econnrefused', 'enotfound'],
};

export async function executeWithRetry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await executeWithTimeout(fn, config.timeoutMs);
    } catch (error) {
      const err = error as Error;
      const timeoutError = isTimeoutError(err);

      const canRetryTimeout = !timeoutError || config.retryTimeouts;
      const retryable = isRetryableError(err, config);

      if (attempt >= config.maxRetries || !canRetryTimeout || !retryable) {
        throw new RetryError(err.message || 'Request failed after retries', error, timeoutError);
      }

      const delayMs = config.exponentialBackoff ? 1000 * 2 ** attempt : 1000;

      await delay(delayMs);
    }
  }

  throw new Error('Unreachable');
}

function executeWithTimeout<T>(fn: (signal?: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, timeoutMs);

    fn(controller.signal)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

function isRetryableError(error: unknown, config: Required<RetryOptions>): boolean {
  const err = error as Error;

  return (
    config.retryableStatuses.includes((error as any)?.status) ||
    config.retryableMessages.some((msg) => err.message?.toLowerCase().includes(msg))
  );
}

function isTimeoutError(error: Error): boolean {
  return error.message?.toLowerCase().includes('timeout') ?? false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
