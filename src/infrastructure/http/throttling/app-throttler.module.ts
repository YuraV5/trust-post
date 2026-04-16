import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';

const PAYMENT_ANONYMOUS_ROUTE = '/api/v1/payments/anonymous';
const WAYFORPAY_WEBHOOK_ROUTE = '/api/v1/payments/webhook/wayforpay';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new RedisThrottlerStorage(config),
        skipIf: (context) => {
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
