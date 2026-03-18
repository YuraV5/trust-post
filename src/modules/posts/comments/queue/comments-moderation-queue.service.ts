import { Inject, Injectable } from '@nestjs/common';
import { BaseQueueService } from '../../../queues/base-queue.service';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { COMMENTS_MODERATION_JOB, COMMENTS_MODERATION_QUEUE } from '../consts';
import { COMMENTS_QUEUE_JOB_OPTIONS } from '../configs/comments-queue.config';
import { AGENT_ACTION_TYPE } from '../../../core-agents/consts';

@Injectable()
export class CommentsModerationQueueService extends BaseQueueService {
  constructor(@Inject(APP_LOGGER) logger: IAppLogger, @InjectQueue(COMMENTS_MODERATION_QUEUE) queue: Queue) {
    super(logger, queue);
  }

  async enqueue(data: { commentId: number; postId: number; content: string }): Promise<void> {
    const { commentId, postId, content } = data;
    return this.add(
      COMMENTS_MODERATION_JOB.MODERATE_COMMENT,
      { commentId, postId, content, actionType: AGENT_ACTION_TYPE.CommentModeration },
      {
        ...COMMENTS_QUEUE_JOB_OPTIONS,
        jobId: `${COMMENTS_MODERATION_JOB.MODERATE_COMMENT}-${commentId}`,
        priority: 2,
      },
    );
  }
}
