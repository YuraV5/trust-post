import { User } from '@prisma/client';
import { UserOutput } from '../types';

export const userMapper = (user: User): UserOutput => ({
  id: user.id,
  name: user.name,
  email: user.email,
  photoUrl: user.photoUrl,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

export const usersMapper = (users: User[]): UserOutput[] => users.map(userMapper);