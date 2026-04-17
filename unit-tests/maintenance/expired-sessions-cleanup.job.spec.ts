import { ExpiredSessionsCleanupJob } from '../../src/modules/maintenance/jobs/expired-sessions-cleanup.job';
import { StubAppLogger } from '../__mock__';

describe('ExpiredSessionsCleanupJob', () => {
  const txMock = {
    session: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const prismaMock = {
    session: {
      count: jest.fn(),
    },
    transaction: jest.fn((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
  };

  let job: ExpiredSessionsCleanupJob;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock));
    job = new ExpiredSessionsCleanupJob(prismaMock as any, StubAppLogger);
  });

  describe('handle', () => {
    it('logs debug and returns early when there are no expired sessions', async () => {
      prismaMock.session.count.mockResolvedValue(0);

      await job.handle();

      expect(prismaMock.transaction).not.toHaveBeenCalled();
      expect(StubAppLogger.debug).toHaveBeenCalled();
      expect(StubAppLogger.info).not.toHaveBeenCalled();
    });

    it('deletes expired sessions in batches and logs info', async () => {
      prismaMock.session.count.mockResolvedValue(2);
      txMock.session.findMany.mockResolvedValue([{ id: 'session-1' }, { id: 'session-2' }]);
      txMock.session.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      expect(prismaMock.transaction).toHaveBeenCalled();
      expect(txMock.session.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
      });
      expect(StubAppLogger.info).toHaveBeenCalled();
    });

    it('exits loop early when batch returns fewer than batch size', async () => {
      prismaMock.session.count.mockResolvedValue(2);
      txMock.session.findMany.mockResolvedValue([{ id: 'session-1' }, { id: 'session-2' }]);
      txMock.session.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      // Only one transaction call because 2 < BATCH_SIZE (100)
      expect(prismaMock.transaction).toHaveBeenCalledTimes(1);
    });

    it('logs error and does not rethrow when DB fails', async () => {
      prismaMock.session.count.mockRejectedValue(new Error('connection lost'));

      await expect(job.handle()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
    });
  });
});
