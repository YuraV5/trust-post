import { PostsStatusMetricsJob } from '../../src/modules/maintenance/jobs/posts-status-metrics.job';
import { PostStatus } from '@prisma/client';
import { StubAppLogger } from '../__mock__';

describe('PostsStatusMetricsJob', () => {
  const prismaMock = {
    post: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const metricsServiceMock = {
    setCurrentPostsTotal: jest.fn(),
    setCurrentPostsByStatus: jest.fn(),
    setCurrentPostsPendingModeration: jest.fn(),
  };

  let job: PostsStatusMetricsJob;

  beforeEach(() => {
    jest.clearAllMocks();
    job = new PostsStatusMetricsJob(prismaMock as any, metricsServiceMock as any, StubAppLogger);
  });

  describe('syncPostsStatusMetrics', () => {
    it('sets total posts and per-status counts', async () => {
      const groupedByStatus = [
        { status: PostStatus.APPROVED, _count: { _all: 10 } },
        { status: PostStatus.PENDING_REVIEW, _count: { _all: 3 } },
      ];
      prismaMock.post.count.mockResolvedValue(13);
      prismaMock.post.groupBy.mockResolvedValue(groupedByStatus);

      await job.syncPostsStatusMetrics();

      expect(metricsServiceMock.setCurrentPostsTotal).toHaveBeenCalledWith(13);
      expect(metricsServiceMock.setCurrentPostsByStatus).toHaveBeenCalledWith(PostStatus.APPROVED, 10);
      expect(metricsServiceMock.setCurrentPostsByStatus).toHaveBeenCalledWith(PostStatus.PENDING_REVIEW, 3);
      expect(metricsServiceMock.setCurrentPostsPendingModeration).toHaveBeenCalledWith(3);
    });

    it('sets pending moderation to 0 when no PENDING_REVIEW posts exist', async () => {
      prismaMock.post.count.mockResolvedValue(5);
      prismaMock.post.groupBy.mockResolvedValue([{ status: PostStatus.APPROVED, _count: { _all: 5 } }]);

      await job.syncPostsStatusMetrics();

      expect(metricsServiceMock.setCurrentPostsPendingModeration).toHaveBeenCalledWith(0);
    });

    it('resets all statuses to 0 before applying grouped results', async () => {
      prismaMock.post.count.mockResolvedValue(0);
      prismaMock.post.groupBy.mockResolvedValue([]);

      await job.syncPostsStatusMetrics();

      const allStatuses = Object.values(PostStatus);
      allStatuses.forEach((status) => {
        expect(metricsServiceMock.setCurrentPostsByStatus).toHaveBeenCalledWith(status, 0);
      });
    });

    it('logs error and does not rethrow when DB query fails', async () => {
      prismaMock.post.count.mockRejectedValue(new Error('DB error'));
      prismaMock.post.groupBy.mockRejectedValue(new Error('DB error'));

      await expect(job.syncPostsStatusMetrics()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
      expect(metricsServiceMock.setCurrentPostsTotal).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('calls syncPostsStatusMetrics on init', async () => {
      prismaMock.post.count.mockResolvedValue(0);
      prismaMock.post.groupBy.mockResolvedValue([]);

      await job.onModuleInit();

      expect(prismaMock.post.count).toHaveBeenCalled();
    });
  });
});
