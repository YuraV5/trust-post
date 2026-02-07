import { UserRoles } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: UserRoles;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface TokenRefreshUser {
  userId: string;
  sessionId?: string;
}

export interface RefreshTokenRequest extends Request {
  user: TokenRefreshUser;
  refreshToken: string;
}
