import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import type { IOAuthProvider } from '../interfaces/oauth-provider.interface';
import type { OAuthTokenResult, OAuthUserProfile } from '../types';
import {
  AppOAuthEmailMissingException,
  AppOAuthProviderIdMissingException,
  AppOAuthTokenExchangeException,
  AppOAuthUserInfoFetchException,
} from '../errors/oauth.errors';

// Raw Google API types
type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

@Injectable()
export class GoogleOAuthProvider implements IOAuthProvider {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {}

  getProvider(): AuthProvider {
    return AuthProvider.GOOGLE;
  }

  getAuthorizationUrl(state: string): string {
    const { clientId, callbackUrl } = this.getConfig();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: ['openid', 'email', 'profile'].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResult> {
    const { clientId, clientSecret, callbackUrl } = this.getConfig();

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const data = (await res.json()) as GoogleTokenResponse;

    if (!res.ok || data.error || !data.access_token) {
      this.logger.error('Google token exchange failed', {
        context: 'GoogleOAuthProvider.exchangeCode',
        status: res.status,
        error: data.error,
        errorDescription: data.error_description,
      });
      throw new AppOAuthTokenExchangeException('Google');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = (await res.json()) as Partial<GoogleUserInfoResponse>;

    if (!res.ok) {
      this.logger.error('Failed to fetch Google user profile', {
        context: 'GoogleOAuthProvider.getUserProfile',
        status: res.status,
      });
      throw new AppOAuthUserInfoFetchException('Google');
    }

    if (!data.email) throw new AppOAuthEmailMissingException('Google');
    if (!data.sub) throw new AppOAuthProviderIdMissingException('Google');

    return {
      providerId: data.sub,
      email: data.email,
      emailVerified: data.email_verified,
      name: data.name,
      picture: data.picture,
    };
  }

  private getConfig(): GoogleOAuthConfig {
    return {
      clientId: this.config.getOrThrow<string>('googleOAuth.clientId'),
      clientSecret: this.config.getOrThrow<string>('googleOAuth.clientSecret'),
      callbackUrl: this.config.getOrThrow<string>('googleOAuth.callbackUrl'),
    };
  }
}
