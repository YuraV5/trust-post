import { Global, Module } from '@nestjs/common';
import { APP_LOGGER, AppLogger } from './services/app-logger';

@Global()
@Module({
  providers: [
    {
      provide: APP_LOGGER,
      useClass: AppLogger,
    },
  ],
  exports: [APP_LOGGER],
})
export class AppLoggerModule {}
