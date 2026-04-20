import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { setupGlobalSettings } from '../../../src/app/server';
import { EmailQueueService } from '../../../src/modules/emails/email-queue.service';
import { CommentsModerationQueueService } from '../../../src/modules/posts/comments/queue/comments-moderation-queue.service';
import { PostsQueueService } from '../../../src/modules/posts/queue/posts-queue.service';

const emptyHealthSnapshot = (queueName: string) => ({
  queueName,
  counts: {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  dlqCount: 0,
  failedRetriedCount: 0,
  oldestWaitingJobAgeSeconds: 0,
});

const mockedEmailQueueService = {
  getQueueName: jest.fn().mockReturnValue('email-notification-queue'),
  getHealthSnapshot: jest.fn().mockResolvedValue(emptyHealthSnapshot('email-notification-queue')),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountActivationEmail: jest.fn().mockResolvedValue(undefined),
  enqueuePostRejectedEmail: jest.fn().mockResolvedValue(undefined),
  moveToDlq: jest.fn().mockResolvedValue(undefined),
};

const mockedPostsQueueService = {
  getQueueName: jest.fn().mockReturnValue('posts-queue'),
  getHealthSnapshot: jest.fn().mockResolvedValue(emptyHealthSnapshot('posts-queue')),
  assignReviewerToPost: jest.fn().mockResolvedValue(undefined),
  moveToDlq: jest.fn().mockResolvedValue(undefined),
};

const mockedCommentsModerationQueueService = {
  getQueueName: jest.fn().mockReturnValue('comments-moderation-queue'),
  getHealthSnapshot: jest.fn().mockResolvedValue(emptyHealthSnapshot('comments-moderation-queue')),
  enqueue: jest.fn().mockResolvedValue(undefined),
  moveToDlq: jest.fn().mockResolvedValue(undefined),
};

export const createE2EApp = async (): Promise<INestApplication> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailQueueService)
    .useValue(mockedEmailQueueService)
    .overrideProvider(PostsQueueService)
    .useValue(mockedPostsQueueService)
    .overrideProvider(CommentsModerationQueueService)
    .useValue(mockedCommentsModerationQueueService)
    .compile();

  const app = moduleFixture.createNestApplication();
  setupGlobalSettings(app, app.get(ConfigService));
  await app.init();

  return app;
};
