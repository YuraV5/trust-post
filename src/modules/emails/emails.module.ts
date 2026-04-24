import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_NOTIFICATION_QUEUE } from './const';
import { EmailProcessor } from './email-queue.processor';
import { EmailQueueService } from './email-queue.service';
import { QueuesModule } from '../queues/queues.module';
import { EmailsProviderModule } from './emails-provider/emails-provider.module';
import { REDIS_DB } from '../../configs/redis/redis-db';
import { APP_MODE } from '../../common/consts';

@Module({
  imports: [
    QueuesModule,
    EmailsProviderModule,
    BullModule.registerQueueAsync({
      name: EMAIL_NOTIFICATION_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password:
            config.get<string>('nodeEnv') === APP_MODE.PRODUCTION ? config.get<string>('redis.password') : undefined,
          db: REDIS_DB.EMAIL,
        },
      }),
    }),
  ],
  providers: [EmailProcessor, EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailsModule {}
