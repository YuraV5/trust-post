export const mockSocketService = {
  emitToRoom: jest.fn(),
  emitToUser: jest.fn(),
  registerNamespace: jest.fn(),
  trackConnection: jest.fn(),
  trackDisconnection: jest.fn(),
};
