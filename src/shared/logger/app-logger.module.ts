import { Global, Module } from '@nestjs/common';
import { APP_LOGGER, AppLogger } from './services/app-logger';
import { LoggerConfigService } from './services/logger-config.service';

@Global()
@Module({
  providers: [
    LoggerConfigService,
    {
      provide: APP_LOGGER,
      useClass: AppLogger,
    },
  ],
  exports: [APP_LOGGER],
})
export class AppLoggerModule {}
