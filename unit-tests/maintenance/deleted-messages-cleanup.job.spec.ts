import { DeletedMessagesCleanupJob } from '../../src/modules/maintenance/jobs/deleted-messages-cleanup.job';
import { StubAppLogger } from '../__mock__';

describe('DeletedMessagesCleanupJob', () => {
  const txMock = {
    chatFile: { deleteMany: jest.fn() },
    message: { deleteMany: jest.fn() },
  };

  const prismaMock = {
    message: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
  };

  const configMock = {
    get: jest.fn(),
  };

  let job: DeletedMessagesCleanupJob;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock));
    configMock.get.mockReturnValue(undefined); // defaults to 200
    job = new DeletedMessagesCleanupJob(prismaMock as any, configMock as any, StubAppLogger);
  });

  describe('handle', () => {
    it('logs debug and returns early when no soft-deleted messages found', async () => {
      prismaMock.message.findMany.mockResolvedValue([]);

      await job.handle();

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(StubAppLogger.debug).toHaveBeenCalled();
      expect(StubAppLogger.info).not.toHaveBeenCalled();
    });

    it('deletes chat files and messages in a transaction for the found batch', async () => {
      prismaMock.message.findMany.mockResolvedValue([{ id: 'msg-1' }, { id: 'msg-2' }]);
      txMock.chatFile.deleteMany.mockResolvedValue({ count: 1 });
      txMock.message.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(txMock.chatFile.deleteMany).toHaveBeenCalledWith({
        where: { messageId: { in: ['msg-1', 'msg-2'] } },
      });
      expect(txMock.message.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['msg-1', 'msg-2'] } },
      });
      expect(StubAppLogger.info).toHaveBeenCalled();
    });

    it('uses batchLimit from config when provided', async () => {
      configMock.get.mockReturnValue(50);
      job = new DeletedMessagesCleanupJob(prismaMock as any, configMock as any, StubAppLogger);
      prismaMock.message.findMany.mockResolvedValue([]);

      await job.handle();

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('defaults batchLimit to 200 when config returns undefined', async () => {
      prismaMock.message.findMany.mockResolvedValue([]);

      await job.handle();

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it('logs error and does not rethrow when DB fails', async () => {
      prismaMock.message.findMany.mockRejectedValue(new Error('DB error'));

      await expect(job.handle()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
    });
  });
});
