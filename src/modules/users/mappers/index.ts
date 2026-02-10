import { User } from '@prisma/client';
import { UserProfileOutput } from '../types';

export const userMapper = (user: User): UserProfileOutput => ({
  id: user.id,
  name: user.name,
  email: user.email,
  photoUrl: user.photoUrl,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

export const usersMapper = (users: User[]): UserProfileOutput[] => users.map(userMapper);
