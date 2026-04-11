import { Job } from 'bullmq';
import { POSTS_JOB } from '../../src/modules/posts/consts';
import { PostsQueueProcessor } from '../../src/modules/posts/queue/posts-queue.processor';
import { PostsReviewService } from '../../src/modules/posts/services';
import { StubAppLogger } from '../__mock__';

describe('PostsQueueProcessor', () => {
  const postReviewServiceMock = {
    assignReviewer: jest.fn(),
  } as unknown as PostsReviewService;

  let processor: PostsQueueProcessor;

  beforeEach(() => {
    processor = new PostsQueueProcessor(StubAppLogger, postReviewServiceMock);
    jest.clearAllMocks();
  });

  it('rethrows error in assign-reviewer job to allow BullMQ retries', async () => {
    const processingError = new Error('queue temporary error');
    (postReviewServiceMock.assignReviewer as jest.Mock).mockRejectedValue(processingError);

    const job = {
      name: POSTS_JOB.ASSIGN_REVIEWER,
      data: { postId: 7 },
      id: 'test-job-id',
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).rejects.toThrow('queue temporary error');
    expect(postReviewServiceMock.assignReviewer).toHaveBeenCalledWith(7);
    expect(StubAppLogger.error).toHaveBeenCalled();
  });

  it('throws and logs error for unknown job names so BullMQ can fail the job', async () => {
    const job = {
      name: 'unknown-job',
      data: { postId: 1 },
      id: 'test-job-id',
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).rejects.toThrow('No processor defined for job unknown-job');
    expect(StubAppLogger.error).toHaveBeenCalled();
  });
});
