import { SessionsService } from '../../src/modules/auth/sessions/services/sessions.service';
import { SessionNotFoundError } from '../../src/modules/auth/sessions/errors/session-not-found';
import { AppForbiddenException } from '../../src/shared/errors/app-errors';
import { StubAppLogger } from '../__mock__';
import { sessionRepoMock } from './__mock__';

describe('SessionsService', () => {
  const hashServiceMock = {
    compare: jest.fn(),
  };

  const service = new SessionsService(StubAppLogger, sessionRepoMock as any, hashServiceMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSession', () => {
    it('returns false when session is expired or missing in active lookup', async () => {
      sessionRepoMock.findActiveById.mockResolvedValue(null);

      const result = await service.validateSession('session-1', 'refresh-token');

      expect(result).toBe(false);
      expect(sessionRepoMock.findActiveById).toHaveBeenCalledWith('session-1');
      expect(hashServiceMock.compare).not.toHaveBeenCalled();
    });

    it('returns false when refresh token hash does not match', async () => {
      sessionRepoMock.findActiveById.mockResolvedValue({ id: 'session-1', refreshTokenHash: 'stored-hash' });
      hashServiceMock.compare.mockResolvedValue(false);

      const result = await service.validateSession('session-1', 'refresh-token');

      expect(result).toBe(false);
      expect(hashServiceMock.compare).toHaveBeenCalledWith('refresh-token', 'stored-hash');
    });

    it('returns true when active session exists and token matches hash', async () => {
      sessionRepoMock.findActiveById.mockResolvedValue({ id: 'session-1', refreshTokenHash: 'stored-hash' });
      hashServiceMock.compare.mockResolvedValue(true);

      const result = await service.validateSession('session-1', 'refresh-token');

      expect(result).toBe(true);
    });
  });

  describe('deleteBySessionId', () => {
    it('throws SessionNotFoundError when deleting non-existing session', async () => {
      sessionRepoMock.findById.mockResolvedValue(null);

      await expect(service.deleteBySessionId('missing', 'user-1')).rejects.toBeInstanceOf(SessionNotFoundError);
    });

    it('throws AppForbiddenException when session belongs to a different user', async () => {
      sessionRepoMock.findById.mockResolvedValue({ id: 'session-1', userId: 'other-user' });

      await expect(service.deleteBySessionId('session-1', 'user-1')).rejects.toBeInstanceOf(AppForbiddenException);
      expect(sessionRepoMock.deleteByIds).not.toHaveBeenCalled();
    });

    it('deletes session and returns success message', async () => {
      sessionRepoMock.findById.mockResolvedValue({ id: 'session-1', userId: 'user-1' });
      sessionRepoMock.deleteByIds.mockResolvedValue(1);

      const result = await service.deleteBySessionId('session-1', 'user-1');

      expect(result).toEqual({ message: 'Session deleted' });
      expect(sessionRepoMock.deleteByIds).toHaveBeenCalledWith(['session-1']);
    });
  });

  describe('deleteAllSessions', () => {
    it('returns deleted count message when sessions exist', async () => {
      sessionRepoMock.deleteByUserId.mockResolvedValue(3);

      const result = await service.deleteAllSessions('user-1');

      expect(result).toEqual({ message: '3 sessions deleted' });
      expect(sessionRepoMock.deleteByUserId).toHaveBeenCalledWith('user-1');
    });

    it('returns no-op message when user has no sessions', async () => {
      sessionRepoMock.deleteByUserId.mockResolvedValue(0);

      const result = await service.deleteAllSessions('user-1');

      expect(result).toEqual({ message: 'No sessions deleted' });
    });
  });

  describe('getMySessions', () => {
    it('returns empty array and warns when user has no sessions', async () => {
      sessionRepoMock.findByUserId.mockResolvedValue([]);

      const result = await service.getMySessions('user-1');

      expect(result).toEqual([]);
      expect(StubAppLogger.warn).toHaveBeenCalled();
    });

    it('returns mapped sessions array', async () => {
      const now = new Date();
      sessionRepoMock.findByUserId.mockResolvedValue([
        { id: 's1', ip: '127.0.0.1', userAgent: 'Chrome', lastUsedAt: now, createdAt: now },
      ]);

      const result = await service.getMySessions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 's1' });
    });
  });
});
