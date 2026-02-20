import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, Logger, transports } from 'winston';
import { APP_NODE_MODE } from '../../../common/consts/node-mode';
import { IAppLogger, LoggerInfo, LogMeta } from '../intefaces/interface';
import { Context } from '../../contex/context.service';

export const APP_LOGGER = 'APP_LOGGER';

@Injectable()
export class AppLogger implements IAppLogger {
  private readonly logger: Logger;
  private readonly nodeEnv: string;
  private readonly logLevel: string;

  constructor(private readonly config: ConfigService) {
    this.nodeEnv = this.config.getOrThrow<string>('nodeEnv');
    this.logLevel = this.config.get('loggerLevel') || 'info';
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
    return this.nodeEnv === APP_NODE_MODE.PROD ? this.createProdLogger() : this.createDevLogger();
  }

  private createProdLogger(): Logger {
    return createLogger({
      level: this.logLevel || 'info',
      format: format.combine(
        format.timestamp(),
        format.printf((info) => {
          const ctx = Context.get();
          const logData: Record<string, unknown> = {
            ts: info.timestamp,
            lvl: info.level,
            pid: process.pid,
            rid: ctx?.requestId ?? info.rid ?? 'no-rid',
            method: ctx?.method ?? info.method ?? null,
            path: ctx?.path ?? info.path ?? null,
            status: ctx?.status ?? info.status ?? null,
            duration: ctx?.duration ?? info.duration ?? null,
            ctx: info.context ?? null,
            msg: info.message,
            stack: info.stack ?? null,
          };

          // Add all additional fields from meta
          const metaFields = Object.keys(info).filter(
            (key) =>
              ![
                'timestamp',
                'level',
                'message',
                'stack',
                'context',
                'rid',
                'method',
                'path',
                'status',
                'duration',
                'splat',
                'label',
              ].includes(key),
          );
          metaFields.forEach((key) => {
            logData[key] = info[key];
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
          let log =
            `[${info.timestamp}] [${info.level}] [pid:${process.pid}] [rid:${ctx?.requestId ?? 'no-rid'}]` +
            ` [${ctx?.method ?? '-'} ${ctx?.path ?? '-'}]` +
            ` [${ctx?.status ?? '-'} ${ctx?.duration ?? '-'}ms] ` +
            `${info.message}`;

          // Add all additional fields from meta
          const metaFields = Object.keys(info).filter(
            (key) => !['timestamp', 'level', 'message', 'stack', 'context', 'splat', 'label'].includes(key),
          );

          if (metaFields.length > 0) {
            const meta: Record<string, unknown> = {};
            metaFields.forEach((key) => {
              meta[key] = info[key];
            });
            log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
          }

          if (info.stack) {
            log += `\n${info.stack}`;
          }

          return log;
        }),
      ),
      transports: [new transports.Console()],
      exceptionHandlers: [new transports.Console()],
      rejectionHandlers: [new transports.Console()],
    });
  }
}
