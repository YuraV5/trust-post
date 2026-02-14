import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EMAIL_NOTIFICATION_QUEUE } from './const';
import { EmailProcessor } from './email-queue.processor';
import { EmailQueueService } from './email-queue.service';
import { QueuesModule } from '../queues/queues.module';
import { EmailsProviderModule } from '../emails-provider/emails-provider.module';

@Module({
  imports: [
    QueuesModule,
    EmailsProviderModule,
    BullModule.registerQueue({
      name: EMAIL_NOTIFICATION_QUEUE,
      connection: {
        db: 1,
      },
    }),
  ],
  providers: [EmailProcessor, EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailsModule {}
