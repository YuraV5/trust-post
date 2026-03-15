export const mockSessionsService = {
  getMySessions: jest.fn(),
    deleteAllSessions: jest.fn(),
    deleteBySessionId: jest.fn(),
    deleteAllExceptCurrentSession: jest.fn(),
    setLastUsedTimestamp: jest.fn(),
    createOrUpdate: jest.fn(),
    validateSession: jest.fn(),
    getSessionByUserIdAndDeviceId: jest.fn(),
};

export const sessionRepoMock = {
    findById: jest.fn(),
    findActiveById: jest.fn(),
    findByUserId: jest.fn(),
    deleteByIds: jest.fn(),
    deleteByUserId: jest.fn(),
    deleteSessionsExceptCurrent: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    findByUserIdAndDeviceId: jest.fn(),
  };