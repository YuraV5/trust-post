export const CONCURRENCY_LIMIT = 3;
export const RATE_LIMIT_DELAY_MS = 100; // Delay between requests to avoid rate limiting
export const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
export const MAX_RETRIES = 3;

export const MAX_IMAGE_FILES_PER_REQUEST = 10;
export const MAX_IMAGE_FILE_SIZE_BYTES = 6 * 1024 * 1024;

export const MAX_DOCUMENT_FILES_PER_REQUEST = 5;
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const TIMEOUT_MS = {
  upload: 30000,
  delete: 10000,
};
