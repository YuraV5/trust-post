import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoreAgentsModule } from '../../core-agents/core-agents.module';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './comments.controller';
import { CommentsRepo, CommentLikeRepo } from './repo';
import { BullModule } from '@nestjs/bullmq';
import { REDIS_DB } from '../../../configs/redis/redis-db';
import { COMMENTS_MODERATION_QUEUE } from './consts';
import { CommentsModerationQueueProcessor, CommentsModerationQueueService } from './queue';
import { CommentsModerationService } from './moderation/comments-moderation.service';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [
    CoreAgentsModule,
    SecurityModule,
    BullModule.registerQueueAsync({
      name: COMMENTS_MODERATION_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          db: REDIS_DB.COMMENTS,
        },
      }),
    }),
  ],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentsRepo,
    CommentLikeRepo,
    CommentsModerationQueueService,
    CommentsModerationQueueProcessor,
    CommentsModerationService,
  ],
  exports: [CommentsService, CommentsModerationQueueService],
})
export class CommentsModule {}
