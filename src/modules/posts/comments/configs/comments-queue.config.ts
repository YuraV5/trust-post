import { JobOptions } from '../../../queues/types';

export const COMMENTS_QUEUE_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: 50,
  timeout: 30_000,
  lifo: false,
};
