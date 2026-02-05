import appConfig from './configs/app/app.config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NodeEnv } from './common/consts';
import { configValidation } from './configs/app/env.schema';
import { AppLoggerModule } from './shared/logger/app-logger.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter, HttpExceptionFilter } from './infrastructure/filters';
import { RequestExecutionContextMiddleware } from './infrastructure/middleware/request-execution-context';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === NodeEnv.DEV || process.env.NODE_ENV === NodeEnv.TEST
          ? `.env.${process.env.NODE_ENV}`
          : [],
      load: [appConfig],
      validationSchema: configValidation,
    }),
    AppLoggerModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestExecutionContextMiddleware).exclude('/health').forRoutes('/*path');
  }
}
