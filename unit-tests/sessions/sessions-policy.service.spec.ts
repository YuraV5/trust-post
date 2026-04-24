import { SessionsPolicy } from '../../src/modules/auth/sessions/services/sessions-policy.service';
import { StubAppLogger } from '../__mock__';

describe('SessionsPolicy', () => {
  const repoMock = {
    findByUserId: jest.fn(),
    deleteByIds: jest.fn(),
  };

  const service = new SessionsPolicy(StubAppLogger, repoMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes oldest sessions when user exceeds max devices', async () => {
    const now = Date.now();
    repoMock.findByUserId.mockResolvedValue(
      Array.from({ length: 7 }).map((_, idx) => ({
        id: `session-${idx + 1}`,
        deviceId: idx === 6 ? 'current-device' : `device-${idx + 1}`,
        createdAt: new Date(now - (idx + 1) * 1000),
        lastUsedAt: new Date(now - (idx + 1) * 1000),
      })),
    );

    await service.prepareForLogin('user-1', 'current-device');

    expect(repoMock.deleteByIds).toHaveBeenCalledTimes(1);
    expect((repoMock.deleteByIds.mock.calls[0] as [string[]])[0]).toHaveLength(2);
  });

  it('does not delete sessions when count is within limit', async () => {
    repoMock.findByUserId.mockResolvedValue([{ id: 's1', deviceId: 'd1', createdAt: new Date(), lastUsedAt: new Date() }]);

    await service.prepareForLogin('user-1', 'd1');

    expect(repoMock.deleteByIds).not.toHaveBeenCalled();
  });

  it('does not delete when session count is exactly at the limit (5)', async () => {
    const now = Date.now();
    repoMock.findByUserId.mockResolvedValue(
      Array.from({ length: 5 }).map((_, idx) => ({
        id: `session-${idx + 1}`,
        deviceId: `device-${idx + 1}`,
        createdAt: new Date(now - idx * 1000),
        lastUsedAt: new Date(now - idx * 1000),
      })),
    );

    await service.prepareForLogin('user-1', 'new-device');

    expect(repoMock.deleteByIds).not.toHaveBeenCalled();
  });

  it('never deletes the current device even when it is the oldest', async () => {
    const now = Date.now();
    // 6 sessions: current device is the oldest
    repoMock.findByUserId.mockResolvedValue(
      Array.from({ length: 6 }).map((_, idx) => ({
        id: `session-${idx + 1}`,
        deviceId: idx === 0 ? 'current-device' : `device-${idx + 1}`,
        createdAt: new Date(now - (6 - idx) * 1000), // session-1 is oldest
        lastUsedAt: new Date(now - (6 - idx) * 1000),
      })),
    );

    await service.prepareForLogin('user-1', 'current-device');

    const deletedIds: string[] = (repoMock.deleteByIds.mock.calls[0] as [string[]])[0];
    expect(deletedIds).not.toContain('session-1'); // current device must be preserved
    expect(deletedIds).toHaveLength(1);
  });
});
