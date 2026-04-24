import { UsersModule } from './../users/users.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostsService } from './services/posts.service';
import { PublicPostsController, StaffPostsController } from './controllers';
import { PostsLikeRepo, PostsRepo, PostsReviewRepo } from './repos';
import { BullModule } from '@nestjs/bullmq';
import { POSTS_QUEUE } from './consts';
import { REDIS_DB } from '../../configs/redis/redis-db';
import { PostsQueueProcessor, PostsQueueService } from './queue';
import { PostsCacheService, PostsReviewService } from './services';
import { EmailsModule } from '../emails/emails.module';
import { CommentsModule } from './comments/comments.module';
import { PostsFilesModule } from './posts-files/posts-files.module';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module';
import { QueueRetryHandlerService } from '../queues/services';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: POSTS_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          db: REDIS_DB.POSTS,
        },
      }),
    }),
    UsersModule,
    EmailsModule,
    CommentsModule,
    PostsFilesModule,
    MetricsModule,
  ],
  controllers: [PublicPostsController, StaffPostsController],
  providers: [
    PostsService,
    PostsReviewService,
    PostsRepo,
    PostsReviewRepo,
    PostsLikeRepo,
    PostsCacheService,
    PostsQueueService,
    PostsQueueProcessor,
    QueueRetryHandlerService,
  ],
  exports: [PostsService, PostsReviewService, PostsQueueService],
})
export class PostsModule {}
