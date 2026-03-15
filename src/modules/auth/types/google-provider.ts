import { AuthProvider } from '@prisma/client';

// ─── Google API raw response types ───────────────────────────────────────────

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token: string;
};

export type GoogleTokenErrorResponse = {
  error: string;
  error_description?: string;
};

export type GoogleUserInfoResponse = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

// ─── Normalised profile (post-parse) ──────────────────────────────────────────

export type GoogleAccessUser = {
  email: string;
  name?: string;
  picture?: string;
  isEmailVerified?: boolean;
  providerId: string;
};

// ─── OAuth flow types ─────────────────────────────────────────────────────────

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

export type GoogleOAuthStatePayload = {
  deviceId: string;
  redirectTo?: string;
};

export type GoogleOAuthAuthResult = {
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
  providerData?: GoogleTokenResponse;
  accessToken?: string;
  refreshToken?: string;
};

export type ProviderAccountUpdateInput = {
  providerData?: GoogleTokenResponse;
  accessToken?: string;
  refreshToken?: string;
};
