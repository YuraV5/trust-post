import { UserRoleTypes } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: UserRoleTypes;
}

export interface TokenRefreshUser {
  userId: string;
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface RefreshTokenRequest extends Request {
  user: TokenRefreshUser;
  refreshToken: string;
}
