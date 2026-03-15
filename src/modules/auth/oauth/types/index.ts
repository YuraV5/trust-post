import { AuthProvider } from '@prisma/client';

// ─── Shared OAuth flow types ──────────────────────────────────────────────────

export type OAuthTokenResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
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

// ─── Provider account repo input types ───────────────────────────────────────

export type ProviderAccountCreateInput = {
  provider: AuthProvider;
  providerId: string;
  userId: string;
  providerData?: unknown;
  accessToken?: string;
  refreshToken?: string;
};

export type ProviderAccountUpdateInput = {
  providerData?: unknown;
  accessToken?: string;
  refreshToken?: string;
};
