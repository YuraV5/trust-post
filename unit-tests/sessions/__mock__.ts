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