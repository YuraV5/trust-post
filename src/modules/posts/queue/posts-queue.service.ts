import { POST_QUEUE_JOB_OPTIONS } from './../configs/posts-queue.config';
import { Inject, Injectable } from '@nestjs/common';
import { BaseQueueService } from '../../queues/base-queue.service';
import { POSTS_JOB, POSTS_QUEUE } from '../consts';
import { InjectQueue } from '@nestjs/bullmq/dist/decorators/inject-queue.decorator';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { Queue } from 'bullmq';

@Injectable()
export class PostsQueueService extends BaseQueueService {
  constructor(@Inject(APP_LOGGER) logger: IAppLogger, @InjectQueue(POSTS_QUEUE) queue: Queue) {
    super(logger, queue);
  }

  async assignReviewerToPost(postId: number): Promise<void> {
    return this.add(
      POSTS_JOB.ASSIGN_REVIWER,
      { postId },
      { ...POST_QUEUE_JOB_OPTIONS, jobId: `${POSTS_JOB.ASSIGN_REVIWER}-${postId}`, priority: 1 }, // High priority
    );
  }
}
