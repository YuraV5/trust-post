import { AuthProvider } from '@prisma/client';

export type OAuthTokenResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  providerData: Record<string, unknown>;
};

export type OAuthUserProfile = {
  providerId: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
};

export type OAuthStatePayload = {
  provider: AuthProvider;
  deviceId: string;
  redirectTo?: string;
};

export type OAuthCallbackResult = {
  accessToken: string;
  refreshToken: string;
  redirectUrl: string;
  isNewUser: boolean;
};

export type ProviderAccountCreateInput = {
  provider: AuthProvider;
  providerId: string;
  userId: string;
  providerData?: Record<string, unknown>;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
};

export type ProviderAccountUpdateInput = {
  providerData?: Record<string, unknown>;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
};
