import { UnverifiedUsersCleanupJob } from '../../src/modules/maintenance/jobs/unverified-users-cleanup.job';
import { StubAppLogger } from '../__mock__';

describe('UnverifiedUsersCleanupJob', () => {
  const txMock = {
    user: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const prismaMock = {
    user: {
      count: jest.fn(),
    },
    transaction: jest.fn((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
  };

  let job: UnverifiedUsersCleanupJob;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock));
    job = new UnverifiedUsersCleanupJob(prismaMock as any, StubAppLogger);
  });

  describe('handle', () => {
    it('logs debug and returns early when no unverified users older than 24h', async () => {
      prismaMock.user.count.mockResolvedValue(0);

      await job.handle();

      expect(prismaMock.transaction).not.toHaveBeenCalled();
      expect(StubAppLogger.debug).toHaveBeenCalled();
      expect(StubAppLogger.info).not.toHaveBeenCalled();
    });

    it('queries users older than 24h cutoff date', async () => {
      prismaMock.user.count.mockResolvedValue(0);

      const before = Date.now();
      await job.handle();
      const after = Date.now();

      const callArgs = prismaMock.user.count.mock.calls[0][0];
      const cutoff: Date = callArgs.where.createdAt.lt;

      // cutoff should be ~24h ago
      expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - 24 * 60 * 60 * 1000 - 100);
      expect(cutoff.getTime()).toBeLessThanOrEqual(after - 24 * 60 * 60 * 1000 + 100);
    });

    it('deletes unverified users in batches and logs info', async () => {
      prismaMock.user.count.mockResolvedValue(2);
      txMock.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      txMock.user.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      expect(prismaMock.transaction).toHaveBeenCalled();
      expect(txMock.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1', 'u2'] } },
      });
      expect(StubAppLogger.info).toHaveBeenCalled();
    });

    it('exits loop when batch returns fewer than batch size', async () => {
      prismaMock.user.count.mockResolvedValue(2);
      txMock.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      txMock.user.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      // 2 < BATCH_SIZE (100), so only one iteration
      expect(prismaMock.transaction).toHaveBeenCalledTimes(1);
    });

    it('logs error and does not rethrow when DB fails', async () => {
      prismaMock.user.count.mockRejectedValue(new Error('DB connection lost'));

      await expect(job.handle()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
    });
  });
});
