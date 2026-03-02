import { UsersModule } from './../users/users.module';
import { Module } from '@nestjs/common';
import { PostsService } from './services/posts.service';
import { PublicPostsController, StaffPostsController } from './controllers';
import { PostsRepo, PostsReviewRepo } from './repos';
import { BullModule } from '@nestjs/bullmq';
import { POSTS_QUEUE } from './consts';
import { REDIS_DB } from '../../configs/redis/redis-db';
import { PostsQueueProcessor, PostsQueueService } from './queue';
import { PostsReviewService } from './services';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: POSTS_QUEUE,
      connection: {
        db: REDIS_DB.POSTS,
      },
    }),
    UsersModule,
    EmailsModule,
  ],
  controllers: [PublicPostsController, StaffPostsController],
  providers: [PostsService, PostsReviewService, PostsRepo, PostsReviewRepo, PostsQueueService, PostsQueueProcessor],
  exports: [PostsService],
})
export class PostsModule {}
