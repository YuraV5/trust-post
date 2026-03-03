import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from '../../src/modules/posts/services/posts.service';
import { EmailQueueServiceMock, StubAppLogger } from '../__mock__';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { PostsLikeRepo, PostsRepo, PostsReviewRepo } from '../../src/modules/posts/repos';
import { PostsQueueProcessor, PostsQueueService } from '../../src/modules/posts/queue';

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        PostsRepo,
        PostsReviewRepo,
        {provide: PostsLikeRepo, useValue: jest.fn()},
        { provide: PostsQueueService, useValue: jest.fn() },
        { provide: PostsQueueProcessor, useValue: jest.fn() },
        { provide: EmailQueueService, useValue: EmailQueueServiceMock },
        { provide: PrismaService, useValue: jest.fn() },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
