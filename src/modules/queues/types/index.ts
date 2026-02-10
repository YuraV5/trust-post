export type BackoffType = 'fixed' | 'exponential';

export type BackoffOptions = {
  type: BackoffType;
  delay: number; // ms
};

export type JobOptions = {
  delay?: number; // delay before start
  priority?: number; // lower number = higher priority
  attempts?: number; // number of attempts
  backoff?: number | BackoffOptions;

  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;

  jobId?: string; // custom id
  repeat?: {
    every?: number; // ms
    cron?: string; // cron expression
    limit?: number;
    startDate?: Date | string;
    endDate?: Date | string;
    tz?: string;
  };

  lifo?: boolean; // FIFO / LIFO
  timeout?: number; // ms
  stackTraceLimit?: number;
};

export type EmailJobData = {
  to: string; // Email recipient
  subject: string; // Email subject
  template: string; // Template name (e.g., 'welcome', 'reset-password')
  context?: Record<string, any>; // Data for the template (user name, links, etc.)
};
