import { QueueHealthMetricsJob } from '../../src/modules/maintenance/jobs/queue-health-metrics.job';
import { StubAppLogger } from '../__mock__';

describe('QueueHealthMetricsJob', () => {
  const makeQueueMock = (name: string) => ({
    getQueueName: jest.fn().mockReturnValue(name),
    getHealthSnapshot: jest.fn(),
  });

  const metricsServiceMock = {
    setQueueJobsCurrent: jest.fn(),
    setQueueDlqJobsCurrent: jest.fn(),
    setQueueFailedRetriedJobsCurrent: jest.fn(),
    setQueueOldestWaitingJobAgeSeconds: jest.fn(),
  };

  let postsQueueMock: ReturnType<typeof makeQueueMock>;
  let commentsQueueMock: ReturnType<typeof makeQueueMock>;
  let emailQueueMock: ReturnType<typeof makeQueueMock>;
  let job: QueueHealthMetricsJob;

  const makeSnapshot = (queueName: string) => ({
    queueName,
    counts: { waiting: 2, active: 1, completed: 50 },
    dlqCount: 0,
    failedRetriedCount: 0,
    oldestWaitingJobAgeSeconds: 5,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    postsQueueMock = makeQueueMock('posts-queue');
    commentsQueueMock = makeQueueMock('comments-queue');
    emailQueueMock = makeQueueMock('email-queue');

    job = new QueueHealthMetricsJob(
      StubAppLogger,
      metricsServiceMock as any,
      postsQueueMock as any,
      commentsQueueMock as any,
      emailQueueMock as any,
    );
  });

  describe('syncQueueHealthMetrics', () => {
    it('syncs metrics for all queues', async () => {
      postsQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('posts-queue'));
      commentsQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('comments-queue'));
      emailQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('email-queue'));

      await job.syncQueueHealthMetrics();

      expect(metricsServiceMock.setQueueJobsCurrent).toHaveBeenCalledTimes(9); // 3 states × 3 queues
      expect(metricsServiceMock.setQueueDlqJobsCurrent).toHaveBeenCalledTimes(3);
      expect(metricsServiceMock.setQueueFailedRetriedJobsCurrent).toHaveBeenCalledTimes(3);
      expect(metricsServiceMock.setQueueOldestWaitingJobAgeSeconds).toHaveBeenCalledTimes(3);
    });

    it('sets correct values from snapshot for a single queue', async () => {
      const snapshot = makeSnapshot('posts-queue');
      postsQueueMock.getHealthSnapshot.mockResolvedValue(snapshot);
      commentsQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('comments-queue'));
      emailQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('email-queue'));

      await job.syncQueueHealthMetrics();

      expect(metricsServiceMock.setQueueJobsCurrent).toHaveBeenCalledWith('posts-queue', 'waiting', 2);
      expect(metricsServiceMock.setQueueJobsCurrent).toHaveBeenCalledWith('posts-queue', 'active', 1);
      expect(metricsServiceMock.setQueueDlqJobsCurrent).toHaveBeenCalledWith('posts-queue', 0);
      expect(metricsServiceMock.setQueueOldestWaitingJobAgeSeconds).toHaveBeenCalledWith('posts-queue', 5);
    });

    it('logs error for a failing queue but continues syncing the rest', async () => {
      postsQueueMock.getHealthSnapshot.mockRejectedValue(new Error('Redis error'));
      commentsQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('comments-queue'));
      emailQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('email-queue'));

      await expect(job.syncQueueHealthMetrics()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
      // other queues still processed
      expect(metricsServiceMock.setQueueDlqJobsCurrent).toHaveBeenCalledWith('comments-queue', 0);
      expect(metricsServiceMock.setQueueDlqJobsCurrent).toHaveBeenCalledWith('email-queue', 0);
    });
  });

  describe('onModuleInit', () => {
    it('calls syncQueueHealthMetrics on init', async () => {
      postsQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('posts-queue'));
      commentsQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('comments-queue'));
      emailQueueMock.getHealthSnapshot.mockResolvedValue(makeSnapshot('email-queue'));

      await job.onModuleInit();

      expect(postsQueueMock.getHealthSnapshot).toHaveBeenCalled();
    });
  });
});
