export interface RetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  exponentialBackoff?: boolean;
  retryableStatuses?: number[];
  retryableMessages?: string[];
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly originalError: any,
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
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableMessages: ['timeout', 'econnrefused', 'enotfound'],
};

/**
 * Executes a function with retry logic and timeout
 * @param fn - The function to execute
 * @param options - Retry configuration options
 * @param retryCount - Current retry attempt (internal use)
 * @returns Promise that resolves with the function result
 * @throws RetryError if all retries fail
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  retryCount = 0,
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    return await Promise.race([fn(), createTimeoutPromise(config.timeoutMs)]);
  } catch (error: any) {
    if (retryCount < config.maxRetries && isRetryableError(error, config)) {
      const delayMs = config.exponentialBackoff ? 1000 * Math.pow(2, retryCount) : 1000;

      await delay(delayMs);
      return executeWithRetry(fn, options, retryCount + 1);
    }

    const isTimeout = error.message?.toLowerCase().includes('timeout');
    throw new RetryError(error.message || 'Request failed after retries', error, isTimeout);
  }
}

/**
 * Creates a promise that rejects after the specified timeout
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
}

/**
 * Checks if an error is retryable based on status codes and error messages
 */
function isRetryableError(error: any, config: Required<RetryOptions>): boolean {
  return (
    config.retryableStatuses.includes(error?.status) ||
    config.retryableMessages.some((msg) => error.message?.toLowerCase().includes(msg))
  );
}

/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
