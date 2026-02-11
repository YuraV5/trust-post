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
    if (meta?.error instanceof Error) {
      this.logger.error(message, { error: meta.error, stack: meta.error.stack, context: meta.context });
    } else {
      this.logger.error(message, { error: meta?.error, context: meta?.context });
    }
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
        format.printf((info) =>
          JSON.stringify({
            ts: info.timestamp,
            lvl: info.level,
            pid: process.pid,
            rid: Context.get()?.requestId ?? 'no-rid',
            method: Context.get()?.method ?? null,
            path: Context.get()?.path ?? null,
            status: Context.get()?.status ?? null,
            duration: Context.get()?.duration ?? null,
            ctx: info.context ?? null,
            msg: info.message,
            stack: info.stack ?? null,
          }),
        ),
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
          return (
            `[${info.timestamp}] [${info.level}] [pid:${process.pid}] [rid:${ctx?.requestId ?? 'no-rid'}]` +
            ` [${ctx?.method ?? '-'} ${ctx?.path ?? '-'}]` +
            ` [${ctx?.status ?? '-'} ${ctx?.duration ?? '-'}ms] ` +
            `${info.message}` +
            (info.stack ? `\n${info.stack}` : '')
          );
        }),
      ),
      transports: [new transports.Console()],
      exceptionHandlers: [new transports.Console()],
      rejectionHandlers: [new transports.Console()],
    });
  }
}
