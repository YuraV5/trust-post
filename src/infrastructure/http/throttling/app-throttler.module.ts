import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { APP_LOGGER } from '@app/shared/logger/services/app-logger';
import { type IAppLogger } from '@app/shared/logger/interfaces/interface';
import { APP_MODE } from '@app/common/consts/node-mode';

const PAYMENT_ANONYMOUS_ROUTE = '/api/v1/payments/anonymous';
const WAYFORPAY_WEBHOOK_ROUTE = '/api/v1/payments/webhook/wayforpay';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [APP_LOGGER, ConfigService],
      useFactory: (logger: IAppLogger, config: ConfigService) => ({
        storage: new RedisThrottlerStorage(logger, config),
        // Skip all throttling in test environment
        skipIf: (context) => {
          const nodeEnv = config.get<APP_MODE>('nodeEnv');
          const isDevOrTest = nodeEnv && ([APP_MODE.DEVELOPMENT, APP_MODE.TEST] as APP_MODE[]).includes(nodeEnv);

          if (isDevOrTest) return true;

          const request = context.switchToHttp().getRequest();
          return request?.url?.startsWith('/health');
        },
        throttlers: [
          {
            name: 'burst',
            ttl: 1000,
            limit: 5,
          },
          {
            name: 'default',
            ttl: config.get<number>('throttling.globalTtlMs', 60000),
            limit: config.get<number>('throttling.globalLimit', 120),
            blockDuration: config.get<number>('throttling.blockTtlMs', 300000),
            generateKey: (_context, tracker, name) => `${name}:${tracker}`,
          },
          {
            name: 'paymentsAnonymous',
            ttl: config.get<number>('throttling.paymentAnonymousTtlMs', 60000),
            limit: config.get<number>('throttling.paymentAnonymousLimit', 5),
            blockDuration: config.get<number>('throttling.paymentAnonymousBlockTtlMs', 300000),
            generateKey: (_context, tracker, name) => `${name}:${tracker}`,
            skipIf: (context) => {
              const request = context.switchToHttp().getRequest();
              return request?.method !== 'POST' || request?.url !== PAYMENT_ANONYMOUS_ROUTE;
            },
          },
          {
            name: 'paymentsWebhook',
            ttl: config.get<number>('throttling.paymentWebhookTtlMs', 60000),
            limit: config.get<number>('throttling.paymentWebhookLimit', 30),
            blockDuration: config.get<number>('throttling.paymentWebhookBlockTtlMs', 300000),
            generateKey: (_context, tracker, name) => `${name}:${tracker}`,
            skipIf: (context) => {
              const request = context.switchToHttp().getRequest();
              return request?.method !== 'POST' || request?.url !== WAYFORPAY_WEBHOOK_ROUTE;
            },
          },
          {
            name: 'long',
            ttl: 3600000,
            limit: 2000,
          },
        ],
      }),
    }),
  ],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class AppThrottlerModule {}
