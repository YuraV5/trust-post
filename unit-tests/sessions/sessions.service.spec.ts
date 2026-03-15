import { SessionsService } from '../../src/modules/auth/sessions/services/sessions.service';
import { SessionNotFoundError } from '../../src/modules/auth/sessions/errors/session-not-found';
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

  it('throws SessionNotFoundError when deleting non-existing session', async () => {
    sessionRepoMock.findById.mockResolvedValue(null);

    await expect(service.deleteBySessionId('missing', 'user-1')).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});
