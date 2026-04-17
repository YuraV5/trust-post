import { ActiveUsersMetricsJob } from '../../src/modules/maintenance/jobs/active-users-metrics.job';
import { StubAppLogger } from '../__mock__';

describe('ActiveUsersMetricsJob', () => {
  const prismaMock = {
    session: {
      findMany: jest.fn(),
    },
  };

  const metricsServiceMock = {
    setActiveUsers: jest.fn(),
  };

  let job: ActiveUsersMetricsJob;

  beforeEach(() => {
    jest.clearAllMocks();
    job = new ActiveUsersMetricsJob(prismaMock as any, metricsServiceMock as any, StubAppLogger);
  });

  describe('syncActiveUsersGauge', () => {
    it('sets active users count based on distinct active sessions', async () => {
      prismaMock.session.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }]);

      await job.syncActiveUsersGauge();

      expect(prismaMock.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { expiresAt: { gt: expect.any(Date) } },
          distinct: ['userId'],
        }),
      );
      expect(metricsServiceMock.setActiveUsers).toHaveBeenCalledWith(3);
      expect(StubAppLogger.debug).toHaveBeenCalled();
    });

    it('sets 0 when there are no active sessions', async () => {
      prismaMock.session.findMany.mockResolvedValue([]);

      await job.syncActiveUsersGauge();

      expect(metricsServiceMock.setActiveUsers).toHaveBeenCalledWith(0);
    });

    it('logs error and does not rethrow when DB query fails', async () => {
      prismaMock.session.findMany.mockRejectedValue(new Error('DB error'));

      await expect(job.syncActiveUsersGauge()).resolves.toBeUndefined();

      expect(StubAppLogger.error).toHaveBeenCalled();
      expect(metricsServiceMock.setActiveUsers).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('calls syncActiveUsersGauge on init', async () => {
      prismaMock.session.findMany.mockResolvedValue([]);

      await job.onModuleInit();

      expect(prismaMock.session.findMany).toHaveBeenCalled();
    });
  });
});
