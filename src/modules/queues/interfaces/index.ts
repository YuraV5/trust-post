import { JobOptions } from '../types';

export interface QueueAddOptions {
  jobName: string;
  options?: JobOptions;
}

export interface IQueueService {
  add<T>(data: T, config: QueueAddOptions): Promise<void>;
}
