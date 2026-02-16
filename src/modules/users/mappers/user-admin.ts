import { User } from '@prisma/client';
import { UserAdminOutput } from '../types';

export const userAdminMapper = (user: User): UserAdminOutput => ({
  id: user.id,
  name: user.name,
  email: user.email,
  photoUrl: user.photoUrl || null,
  isEmailVerified: user.isEmailVerified,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const usersAdminMapper = (users: User[]): UserAdminOutput[] => users.map(userAdminMapper);
