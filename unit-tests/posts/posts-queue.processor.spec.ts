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
      name: POSTS_JOB.ASSIGN_REVIWER,
      data: { postId: 7 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).rejects.toThrow('queue temporary error');
    expect(postReviewServiceMock.assignReviewer).toHaveBeenCalledWith(7);
    expect(StubAppLogger.error).toHaveBeenCalled();
  });

  it('logs warning for unknown job names without throwing', async () => {
    const job = {
      name: 'unknown-job',
      data: { postId: 1 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(StubAppLogger.warn).toHaveBeenCalledWith('No processor defined for job unknown-job');
  });
});
