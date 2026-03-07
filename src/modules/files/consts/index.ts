export const CONCURRENCY_LIMIT = 3;
export const RATE_LIMIT_DELAY_MS = 100; // Delay between requests to avoid rate limiting
export const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
export const MAX_RETRIES = 3;

export const TIMEOUT_MS = {
  upload: 30000,
  delete: 10000,
}