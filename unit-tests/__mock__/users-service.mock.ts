export const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findAuthUserbyId: jest.fn(),
  resetPasswordById: jest.fn(),
  resetPasswordThroughEmail: jest.fn(),
  markEmailAsVerified: jest.fn(),
  activateAccount: jest.fn(),
};
