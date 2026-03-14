import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentsRepo, CommentLikeRepo } from './repo';

@Module({
  imports: [],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsRepo, CommentLikeRepo],
  exports: [CommentsService],
})
export class CommentsModule {}
