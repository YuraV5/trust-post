import { JobOptions } from '../../queues/types';

export const EMAIL_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },

  removeOnComplete: true,
  removeOnFail: 100,

  timeout: 30_000,

  lifo: false, // FIFO
};
