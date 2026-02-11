import { JobOptions } from '../types';

export interface IQueueService {
  add<T>(jobName: string, data: T, options?: JobOptions): Promise<void>;
}
