import { UserRoles } from "@prisma/client";

export const mockUsersRepo = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  updatePassword: jest.fn(),
  markEmailAsVerified: jest.fn(),
  updateStatus: jest.fn(),
  fetchAllModerators: jest.fn(),
  createByProvider: jest.fn(),
  // Admin methods
  updateRoles: jest.fn(),
  deleteMany: jest.fn(),
  createByAdmin: jest.fn(),
  activateAccount: jest.fn(),
  findAllForAdmin: jest.fn(),
};

export const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
  name: 'testuser',
  password: 'password',
  photoUrl: 'http://example.com/photo.jpg',
  isEmailVerified: false,
  isActive: true,
  createdByAdmin: false,
  role: 'USER' as UserRoles,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUserAdminOutput = {
  name: `testuser`,
  id: 'user-id',
  email: 'test@example.com',
  password: 'password',
  photoUrl: 'http://example.com/photo.jpg',
  createdByAdmin: false,
  createdAt: new Date(),
  role: 'USER' as UserRoles,
  isActive: true,
  isEmailVerified: false,
  updatedAt: new Date(),
};

export const mockCreateUserInput = {
  email: 'newuser@example.com',
  name: 'newuser',
  password: 'newpassword',
};
