import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformableInfo } from 'logform';
import { createLogger, format, Logger, transports } from 'winston';
import { APP_MODE } from '../../../common/consts/node-mode';
import { IAppLogger, LoggerInfo, LogMeta } from '../intefaces/interface';
import { Context } from '../../contex/context.service';

export const APP_LOGGER = Symbol('APP_LOGGER');

@Injectable()
export class AppLogger implements IAppLogger {
  private readonly logger: Logger;
  private readonly nodeEnv: string;
  private readonly logLevel: string;
  private readonly cwdPattern: RegExp;

  constructor(private readonly config: ConfigService) {
    this.nodeEnv = this.config.getOrThrow<string>('nodeEnv');
    this.logLevel = this.config.get('loggerLevel') || 'info';
    this.cwdPattern = this.buildCwdPattern(process.cwd());
    this.logger = this.createLogger();
  }

  info(message: string, meta?: LogMeta): void {
    this.logger.info(message, { ...meta });
  }

  error(message: string, meta?: LogMeta): void {
    this.logger.error(message, { ...meta });
  }

  warn(message: string, meta?: LogMeta): void {
    this.logger.warn(message, { ...meta });
  }

  debug(message: string, meta?: LogMeta): void {
    this.logger.debug(message, { ...meta });
  }

  private createLogger() {
    return this.nodeEnv === APP_MODE.PRODUCTION ? this.createProdLogger() : this.createDevLogger();
  }

  private createProdLogger(): Logger {
    return createLogger({
      level: this.logLevel || 'info',
      format: format.combine(
        format.timestamp(),
        format.printf((info) => {
          const ctx = Context.get();
          const safeInfo = this.sanitizeInfo(info);
          const logData: Record<string, unknown> = {
            ts: safeInfo.timestamp,
            lvl: safeInfo.level,
            pid: process.pid,
            rid: ctx?.requestId ?? safeInfo.rid ?? 'no-rid',
            userId: ctx?.userId ?? safeInfo.userId ?? null,
            ip: ctx?.ip ?? safeInfo.ip ?? null,
            method: ctx?.method ?? safeInfo.method ?? null,
            path: ctx?.path ?? safeInfo.path ?? null,
            status: ctx?.status ?? safeInfo.status ?? null,
            duration: ctx?.duration ?? safeInfo.duration ?? null,
            ctx: safeInfo.context ?? null,
            msg: safeInfo.message,
            stack: safeInfo.stack ?? null,
          };

          // Add all additional fields from meta
          const metaFields = Object.keys(safeInfo).filter(
            (key) =>
              ![
                'timestamp',
                'level',
                'message',
                'stack',
                'context',
                'rid',
                'userId',
                'ip',
                'method',
                'path',
                'status',
                'duration',
                'splat',
                'label',
              ].includes(key),
          );
          metaFields.forEach((key) => {
            logData[key] = safeInfo[key];
          });

          return JSON.stringify(logData);
        }),
      ),
      transports: [new transports.Console()],
      exceptionHandlers: [new transports.Console()],
      rejectionHandlers: [new transports.Console()],
    });
  }

  private createDevLogger(): Logger {
    return createLogger({
      level: this.logLevel || 'debug',
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf((info: LoggerInfo) => {
          const ctx = Context.get();
          const safeInfo = this.sanitizeInfo(info);
          const userId = this.formatScalar(ctx?.userId ?? safeInfo.userId);
          const ip = this.formatScalar(ctx?.ip ?? safeInfo.ip);
          const method = this.formatScalar(ctx?.method ?? safeInfo.method);
          const path = this.formatScalar(ctx?.path ?? safeInfo.path);
          const status = this.formatScalar(ctx?.status ?? safeInfo.status);
          const duration = this.formatScalar(ctx?.duration ?? safeInfo.duration);
          let log =
            `[${safeInfo.timestamp}] [${safeInfo.level}] [pid:${process.pid}] [rid:${ctx?.requestId ?? 'no-rid'}]` +
            ` [uid:${userId}] [ip:${ip}]` +
            ` [${method} ${path}]` +
            ` [${status} ${duration}ms] ` +
            `${safeInfo.message}`;

          // Add all additional fields from meta
          const metaFields = Object.keys(safeInfo).filter(
            (key) => !['timestamp', 'level', 'message', 'stack', 'context', 'splat', 'label'].includes(key),
          );

          if (metaFields.length > 0) {
            const meta: Record<string, unknown> = {};
            metaFields.forEach((key) => {
              meta[key] = safeInfo[key];
            });
            log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
          }

          if (safeInfo.stack) {
            log += `\n${safeInfo.stack}`;
          }

          return log;
        }),
      ),
      transports: [new transports.Console()],
      exceptionHandlers: [new transports.Console()],
      rejectionHandlers: [new transports.Console()],
    });
  }

  private sanitizeInfo(info: TransformableInfo): LoggerInfo {
    const sanitized: LoggerInfo = {
      ...(info as LoggerInfo),
      message: typeof info.message === 'string' ? info.message : String(info.message),
    };

    Object.keys(sanitized).forEach((key) => {
      sanitized[key] = this.sanitizeValue(sanitized[key]);
    });

    return sanitized;
  }

  private sanitizeValue(value: unknown): unknown {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: this.redactLocalPaths(value.message),
        stack: value.stack ? this.redactLocalPaths(value.stack) : undefined,
      };
    }

    if (typeof value === 'string') {
      return this.redactLocalPaths(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      const recordValue = value as Record<string, unknown>;
      const sanitizedObject: Record<string, unknown> = {};

      Object.keys(recordValue).forEach((key) => {
        sanitizedObject[key] = this.sanitizeValue(recordValue[key]);
      });

      return sanitizedObject;
    }

    return value;
  }

  private buildCwdPattern(cwd: string): RegExp {
    const normalized = cwd.replace(/\\/g, '/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(normalized, 'gi');
  }

  private redactLocalPaths(input: string): string {
    let sanitized = input;

    // Replace workspace absolute path with a safe relative marker.
    sanitized = sanitized.replace(this.cwdPattern, '.');

    // Mask remaining absolute local paths to avoid leaking host filesystem layout.
    sanitized = sanitized.replace(/[A-Za-z]:\\[^\s\n)]+/g, '<local-path>');
    sanitized = sanitized.replace(/\/(Users|home|var|opt|tmp)\/[^\s\n)]+/g, '<local-path>');

    return sanitized;
  }

  private formatScalar(value: unknown, fallback = '-'): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
      return String(value);
    }

    return fallback;
  }
}
