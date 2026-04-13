import { Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { IAppLogger, LogMeta } from '../interfaces/interface';
import { LoggerConfigService } from './logger-config.service';

export const APP_LOGGER = Symbol('APP_LOGGER');

@Injectable()
export class AppLogger implements IAppLogger {
  private readonly logger: Logger;

  constructor(private readonly loggerConfig: LoggerConfigService) {
    this.logger = this.loggerConfig.build();
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
}
