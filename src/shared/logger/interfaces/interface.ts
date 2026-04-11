import { TransformableInfo } from 'logform';

export interface IAppLogger {
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

export interface LogMeta {
  context?: string;
  error?: Error | string;
  [key: string]: unknown;
}

export interface LoggerInfo extends TransformableInfo {
  context?: string;
  stack?: string;
  message: string;
  rid?: string;
  timestamp?: string;
}
