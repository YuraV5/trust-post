import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueService } from './email-queue.service';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { QUEUE_NAME } from './const';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAME.EMAIL,
    }),
  ],
  controllers: [],
  providers: [EmailQueueService],
  exports: [EmailQueueService],
})
export class QueuesModule {}
