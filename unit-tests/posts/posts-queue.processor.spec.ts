import { Job } from 'bullmq';
import { POSTS_JOB } from '../../src/modules/posts/consts';
import { PostsQueueProcessor } from '../../src/modules/posts/queue/posts-queue.processor';
import { PostsReviewService } from '../../src/modules/posts/services';
import { PostsQueueService } from '../../src/modules/posts/queue';
import { StubAppLogger } from '../__mock__';

describe('PostsQueueProcessor', () => {
  const postReviewServiceMock = {
    assignReviewer: jest.fn(),
  } as unknown as PostsReviewService;

  const postsQueueServiceMock = {
    moveToDlq: jest.fn(),
  } as unknown as PostsQueueService;

  let processor: PostsQueueProcessor;

  beforeEach(() => {
    processor = new PostsQueueProcessor(StubAppLogger, postReviewServiceMock, postsQueueServiceMock);
    jest.clearAllMocks();
  });

  it('resolves successfully for assign-reviewer job', async () => {
    (postReviewServiceMock.assignReviewer as jest.Mock).mockResolvedValue(undefined);

    const job = {
      name: POSTS_JOB.ASSIGN_REVIEWER,
      data: { postId: 7 },
      id: 'test-job-id',
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(postReviewServiceMock.assignReviewer).toHaveBeenCalledWith(7);
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

  it('moves job to DLQ on the last retry attempt', async () => {
    const processingError = new Error('permanent failure');
    (postReviewServiceMock.assignReviewer as jest.Mock).mockRejectedValue(processingError);
    (postsQueueServiceMock.moveToDlq as jest.Mock).mockResolvedValue(undefined);

    const job = {
      name: POSTS_JOB.ASSIGN_REVIEWER,
      data: { postId: 42 },
      id: 'test-job-id',
      attemptsMade: 2, // 0-indexed: this is the 3rd attempt
      opts: { attempts: 3 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).rejects.toThrow('permanent failure');
    expect(postsQueueServiceMock.moveToDlq).toHaveBeenCalledWith(job, processingError);
  });

  it('does not move to DLQ when retries remain', async () => {
    const processingError = new Error('transient error');
    (postReviewServiceMock.assignReviewer as jest.Mock).mockRejectedValue(processingError);

    const job = {
      name: POSTS_JOB.ASSIGN_REVIEWER,
      data: { postId: 5 },
      id: 'test-job-id',
      attemptsMade: 0, // first attempt of 3
      opts: { attempts: 3 },
    } as unknown as Job<unknown>;

    await expect(processor.process(job)).rejects.toThrow('transient error');
    expect(postsQueueServiceMock.moveToDlq).not.toHaveBeenCalled();
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
