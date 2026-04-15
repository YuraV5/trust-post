import { Job } from 'bullmq';
import { JobOptions, QueueHealthSnapshot } from '../types';

export interface IQueueService {
  add<T>(jobName: string, data: T, options?: JobOptions): Promise<void>;
  moveToDlq(job: Job<unknown>, error: unknown): Promise<void>;
  getHealthSnapshot(): Promise<QueueHealthSnapshot>;
  getQueueName(): string;
}
