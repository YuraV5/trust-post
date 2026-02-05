import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, Logger, transports } from 'winston';
import { NodeEnv } from '../../../common/consts/node-mode';
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
    return this.nodeEnv === NodeEnv.PROD ? this.createProdLogger() : this.createDevLogger();
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
            rid: Context.get()?.requestId ?? 'no-rid',
            ctx: (info.context as string | null) ?? null,
            msg: info.message,
            stack: (info.stack as string | null) ?? null,
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
          const rid = Context.get()?.requestId ?? 'no-rid';
          const ctx = info.context ? `[${info.context}]` : '';
          const stack = info.stack ? `\n${info.stack}` : '';
          return `[${info.timestamp}] [${info.level}] [pid:${process.pid}] [rid:${rid}] ${ctx} ${info.message}${stack}`;
        }),
      ),
      transports: [new transports.Console()],
      exceptionHandlers: [new transports.Console()],
      rejectionHandlers: [new transports.Console()],
    });
  }
}
