import appConfig from './configs/app/app.config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidation } from './configs/app/env.schema';
import { AppLoggerModule } from './shared/logger/app-logger.module';
import { RequestExecutionContextMiddleware } from './infrastructure/middleware/request-execution-context';
import { ExceptionFiltersModule } from './infrastructure/filters/exception-filters.module';
import { HealthModule } from './infrastructure/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SecurityModule } from './modules/security/security.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: configValidation,
    }),
    AppLoggerModule,
    ExceptionFiltersModule,
    HealthModule,
    PrismaModule,
    SecurityModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestExecutionContextMiddleware).exclude('/health').forRoutes('/*path');
  }
}
