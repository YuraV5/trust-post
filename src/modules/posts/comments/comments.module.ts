import { Module } from '@nestjs/common';
import { CoreAgentsModule } from '../../core-agents/core-agents.module';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './comments.controller';
import { CommentsRepo, CommentLikeRepo } from './repo';
import { BullModule } from '@nestjs/bullmq';
import { REDIS_DB } from '../../../configs/redis/redis-db';
import { COMMENTS_MODERATION_QUEUE } from './consts';
import { CommentsModerationQueueProcessor, CommentsModerationQueueService } from './queue';
import { CommentsModerationService } from './moderation/comments-moderation.service';

@Module({
  imports: [
    CoreAgentsModule,
    BullModule.registerQueue({
      name: COMMENTS_MODERATION_QUEUE,
      connection: {
        db: REDIS_DB.COMMENTS,
      },
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
  exports: [CommentsService],
})
export class CommentsModule {}
