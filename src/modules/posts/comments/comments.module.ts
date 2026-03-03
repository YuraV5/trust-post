import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentsRepo, LikeRepo } from './repo';

@Module({
  imports: [],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsRepo, LikeRepo],
  exports: [CommentsService],
})
export class CommentsModule {}
