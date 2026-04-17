import { RejectedDeletedCommentsCleanupJob } from '../../src/modules/maintenance/jobs/rejected-deleted-comments-cleanup.job';
import { CommentStatus } from '@prisma/client';
import { StubAppLogger } from '../__mock__';

describe('RejectedDeletedCommentsCleanupJob', () => {
  const txMock = {
    comment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    commentLike: {
      deleteMany: jest.fn(),
    },
  };

  const prismaMock = {
    comment: {
      count: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
  };

  let job: RejectedDeletedCommentsCleanupJob;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock));
    job = new RejectedDeletedCommentsCleanupJob(prismaMock as any, StubAppLogger);
  });

  describe('handle', () => {
    it('logs debug and returns early when no rejected or deleted comments', async () => {
      prismaMock.comment.count.mockResolvedValue(0);

      await job.handle();

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(StubAppLogger.debug).toHaveBeenCalled();
      expect(StubAppLogger.info).not.toHaveBeenCalled();
    });

    it('counts comments with REJECTED or DELETED status', async () => {
      prismaMock.comment.count.mockResolvedValue(0);

      await job.handle();

      expect(prismaMock.comment.count).toHaveBeenCalledWith({
        where: { status: { in: [CommentStatus.REJECTED, CommentStatus.DELETED] } },
      });
    });

    it('deletes comment likes before deleting comments in transaction', async () => {
      prismaMock.comment.count.mockResolvedValue(2);
      txMock.comment.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      txMock.commentLike.deleteMany.mockResolvedValue({ count: 3 });
      txMock.comment.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      expect(txMock.commentLike.deleteMany).toHaveBeenCalledWith({
        where: { commentId: { in: ['c1', 'c2'] } },
      });
      expect(txMock.comment.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1', 'c2'] } },
      });
      expect(StubAppLogger.info).toHaveBeenCalled();
    });

    it('exits loop when batch returns fewer than batch size', async () => {
      prismaMock.comment.count.mockResolvedValue(2);
      txMock.comment.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      txMock.commentLike.deleteMany.mockResolvedValue({ count: 0 });
      txMock.comment.deleteMany.mockResolvedValue({ count: 2 });

      await job.handle();

      // 2 < BATCH_SIZE (100), so only one iteration
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('logs error and does not rethrow when DB fails', async () => {
      prismaMock.comment.count.mockRejectedValue(new Error('DB error'));

      await expect(job.handle()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
    });
  });
});
