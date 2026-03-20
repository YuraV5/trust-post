import { UsersModule } from './../users/users.module';
import { Module } from '@nestjs/common';
import { PostsService } from './services/posts.service';
import { PublicPostsController, StaffPostsController } from './controllers';
import { PostsLikeRepo, PostsRepo, PostsReviewRepo } from './repos';
import { BullModule } from '@nestjs/bullmq';
import { POSTS_QUEUE } from './consts';
import { REDIS_DB } from '../../configs/redis/redis-db';
import { PostsQueueProcessor, PostsQueueService } from './queue';
import { PostsReviewService } from './services';
import { EmailsModule } from '../emails/emails.module';
import { CommentsModule } from './comments/comments.module';
import { PostsFilesModule } from './posts-files/posts-files.module';

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
    CommentsModule,
    PostsFilesModule,
  ],
  controllers: [PublicPostsController, StaffPostsController],
  providers: [
    PostsService,
    PostsReviewService,
    PostsRepo,
    PostsReviewRepo,
    PostsLikeRepo,
    PostsQueueService,
    PostsQueueProcessor,
  ],
  exports: [PostsService, PostsReviewService],
})
export class PostsModule {}
