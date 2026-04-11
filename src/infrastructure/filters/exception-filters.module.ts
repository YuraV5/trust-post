import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter, HttpExceptionFilter, PrismaExceptionFilter } from './index';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class ExceptionFiltersModule {}
