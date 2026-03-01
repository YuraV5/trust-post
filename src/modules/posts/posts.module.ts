import { Module } from '@nestjs/common';
import { PostsService } from './services/posts.service';
import { PublicPostsController, StaffPostsController } from './controllers';
import { PostsRepo, PostsReviewRepo } from './repos';

@Module({
  controllers: [PublicPostsController, StaffPostsController],
  providers: [PostsService, PostsRepo, PostsReviewRepo],
  exports: [PostsService],
})
export class PostsModule {}
