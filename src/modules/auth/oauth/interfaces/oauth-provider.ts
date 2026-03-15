import { AuthProvider } from '@prisma/client';
import type { OAuthTokenResult, OAuthUserProfile } from '../types';

export interface IOAuthProvider {
  getProvider(): AuthProvider;
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenResult>;
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}
