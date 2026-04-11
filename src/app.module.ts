import appConfig from './configs/app/app.config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidation } from './configs/app/env.schema';
import { AppLoggerModule } from './shared/logger/app-logger.module';
import { RequestContextMiddleware } from './infrastructure/middleware';
import { ExceptionFiltersModule } from './infrastructure/filters/exception-filters.module';
import { HealthModule } from './infrastructure/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SecurityModule } from './modules/security/security.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccessTokenGuard } from './common/guards';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpContextInterceptor } from './infrastructure/http/interceptors/http-context.interceptor';
import { IdempotencyInterceptor } from './infrastructure/http/interceptors/idempotency.interceptor';
import { QueuesModule } from './modules/queues/queues.module';
import { EmailsModule } from './modules/emails/emails.module';
import { CacheModule } from './modules/cache/cache.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LinksModule } from './modules/links/links.module';
import { PostsModule } from './modules/posts/posts.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FilesModule } from './modules/files/files.module';
import { ChatModule } from './modules/chat/chat.module';
import { MessageModule } from './modules/message/message.module';
import { SocketModule } from './modules/socket/socket.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { CoreAgentsModule } from './modules/core-agents/core-agents.module';
import { AppThrottlerModule } from './infrastructure/http/throttling/app-throttler.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: configValidation,
    }),
    ScheduleModule.forRoot(),
    AppThrottlerModule,
    AppLoggerModule,
    MetricsModule,
    ExceptionFiltersModule,
    HealthModule,
    PrismaModule,
    SecurityModule,
    UsersModule,
    AuthModule,
    QueuesModule,
    EmailsModule,
    CacheModule,
    LinksModule,
    PostsModule,
    MaintenanceModule,
    FilesModule,
    ChatModule,
    MessageModule,
    SocketModule,
    PaymentsModule,
    AdminModule,
    CoreAgentsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).exclude('/health').forRoutes('/*path');
  }
}
