import { UserRoles } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: UserRoles;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface RefreshTokenUser {
  userId: string;
  sessionId: string;
}

export interface RefreshTokenRequest extends Request {
  user: RefreshTokenUser;
  refreshToken: string;
}
