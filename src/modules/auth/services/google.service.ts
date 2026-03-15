import { UsersService } from './../../users/services/users.service';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { PasswordService, TokensService } from '../../security/services';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsPolicy } from '../sessions/services/sessions-policy.service';
import { SessionsService } from '../sessions/services';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider } from '@prisma/client';
import { ProviderAccountRepo } from '../repo';
import { Context } from '../../../shared/contex/context.service';
import { v4 as uuidv4 } from 'uuid';
import { parseDuration } from '../../../common/utils';
import {
  AppGoogleOAuthAccountConflictException,
  AppGoogleOAuthCodeMissingException,
  AppGoogleOAuthEmailMissingException,
  AppGoogleOAuthInvalidStateException,
  AppGoogleOAuthProviderIdMissingException,
  AppGoogleOAuthProviderRejectedException,
  AppGoogleOAuthTokenExchangeException,
  AppGoogleOAuthUserInfoFetchException,
} from '../errors';
import {
  GoogleAccessUser,
  GoogleOAuthAuthResult,
  GoogleOAuthConfig,
  GoogleOAuthStatePayload,
  GoogleTokenErrorResponse,
  GoogleTokenResponse,
  GoogleUserInfoResponse,
} from '../types/google-provider';
import { IOAuthGoogleService } from '../interfaces';

@Injectable()
export class OAuthGoogleService implements IOAuthGoogleService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly tokensService: TokensService,
    private readonly sessionsService: SessionsService,
    private readonly prismaService: PrismaService,
    private readonly userService: UsersService,
    private readonly providerAccountRepo: ProviderAccountRepo,
    private readonly passwordService: PasswordService,
    private readonly sessionsPolicy: SessionsPolicy,
  ) {}

  redirectToGoogle(deviceId: string, redirectTo?: string): string {
    const googleOAuthConfig = this.getGoogleOAuthConfig();
    const stateToken = this.signOAuthState({
      deviceId,
      redirectTo: this.normalizeRedirectTo(redirectTo),
    });

    const params = new URLSearchParams({
      client_id: googleOAuthConfig.clientId,
      redirect_uri: googleOAuthConfig.callbackUrl,
      response_type: 'code',
      scope: ['openid', 'email', 'profile'].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: stateToken,
    });

    this.logger.debug('Prepared Google OAuth redirect URL', {
      context: 'OAuthGoogleService.redirectToGoogle',
      callbackUrl: googleOAuthConfig.callbackUrl,
      hasDeviceId: Boolean(deviceId),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string, state: string, error?: string): Promise<GoogleOAuthAuthResult> {
    if (error) {
      this.logger.warn('Google OAuth callback returned provider error', {
        context: 'OAuthGoogleService.handleGoogleCallback',
        error,
      });
      throw new AppGoogleOAuthProviderRejectedException();
    }

    if (!code) {
      throw new AppGoogleOAuthCodeMissingException();
    }

    if (!state) {
      throw new AppGoogleOAuthInvalidStateException('Missing OAuth state');
    }

    const statePayload = this.verifyOAuthState(state);
    const tokenData = await this.exchangeCodeForToken(code);
    const googleProfile = await this.fetchGoogleUser(tokenData.access_token);

    const { userId, role, isNewUser } = await this.resolveOrCreateUser(googleProfile, tokenData);
    const sessionTokens = await this.createSessionAndTokens(userId, role, statePayload.deviceId);
    const redirectUrl = this.buildSuccessRedirectUrl(sessionTokens.accessToken, isNewUser, statePayload.redirectTo);

    this.logger.info('Google OAuth callback handled successfully', {
      context: 'OAuthGoogleService.handleGoogleCallback',
      userId,
      isNewUser,
      deviceId: statePayload.deviceId,
    });

    return {
      ...sessionTokens,
      isNewUser,
      redirectUrl,
    };
  }

  private signOAuthState(payload: GoogleOAuthStatePayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: '10m',
      issuer: 'google-oauth-state',
    });
  }

  private verifyOAuthState(token: string): GoogleOAuthStatePayload {
    try {
      const decoded = this.jwt.verify<GoogleOAuthStatePayload>(token, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        issuer: 'google-oauth-state',
      });

      if (!decoded?.deviceId) {
        throw new AppGoogleOAuthInvalidStateException('Invalid OAuth state payload');
      }

      return decoded;
    } catch (err) {
      // Re-throw our own typed errors so they carry the correct HTTP status
      if (err instanceof AppGoogleOAuthInvalidStateException) throw err;
      throw new AppGoogleOAuthInvalidStateException('Invalid or expired OAuth state');
    }
  }

  private async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const googleOAuthConfig = this.getGoogleOAuthConfig();

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleOAuthConfig.clientId,
        client_secret: googleOAuthConfig.clientSecret,
        redirect_uri: googleOAuthConfig.callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse & GoogleTokenErrorResponse;

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      this.logger.error('Google token exchange failed', {
        context: 'OAuthGoogleService.exchangeCodeForToken',
        status: tokenResponse.status,
        error: tokenData.error,
        errorDescription: tokenData.error_description,
      });
      throw new AppGoogleOAuthTokenExchangeException();
    }

    return tokenData;
  }

  private async fetchGoogleUser(accessToken: string): Promise<GoogleAccessUser> {
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userInfo = (await userInfoResponse.json()) as Partial<GoogleUserInfoResponse>;

    if (!userInfoResponse.ok) {
      this.logger.error('Failed to fetch Google user profile', {
        context: 'OAuthGoogleService.fetchGoogleUser',
        status: userInfoResponse.status,
      });
      throw new AppGoogleOAuthUserInfoFetchException();
    }

    if (!userInfo.email) {
      throw new AppGoogleOAuthEmailMissingException();
    }

    if (!userInfo.sub) {
      throw new AppGoogleOAuthProviderIdMissingException();
    }

    return {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      isEmailVerified: userInfo.email_verified,
      providerId: userInfo.sub,
    };
  }

  private async resolveOrCreateUser(
    googleProfile: GoogleAccessUser,
    tokenData: GoogleTokenResponse,
  ): Promise<{ userId: string; role: string; isNewUser: boolean }> {
    const providerId = String(googleProfile.providerId);
    const email = String(googleProfile.email).toLowerCase();

    const providerAccount = await this.providerAccountRepo.findByProviderId(AuthProvider.GOOGLE, providerId);

    if (providerAccount) {
      await this.providerAccountRepo.update(providerAccount.id, {
        providerData: tokenData,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      });

      const existingUser = await this.userService.findAuthUserbyId(providerAccount.userId);
      if (!existingUser) {
        throw new AppGoogleOAuthAccountConflictException('Google account is linked to an invalid user');
      }

      return {
        userId: existingUser.id,
        role: existingUser.role,
        isNewUser: false,
      };
    }

    const existingByEmail = await this.userService.findByEmail(email);

    if (existingByEmail) {
      await this.providerAccountRepo.create({
        provider: AuthProvider.GOOGLE,
        userId: existingByEmail.id,
        providerId,
        providerData: tokenData,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      });

      return {
        userId: existingByEmail.id,
        role: existingByEmail.role,
        isNewUser: false,
      };
    }

    const createdUser = await this.prismaService.transaction(async (tx) => {
      const user = await this.userService.createByProvider(
        {
          email,
          name: googleProfile.name,
          photoUrl: googleProfile.picture,
          isEmailVerified: googleProfile.isEmailVerified,
        },
        tx,
      );

      await this.providerAccountRepo.create(
        {
          provider: AuthProvider.GOOGLE,
          userId: user.id,
          providerId,
          providerData: tokenData,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
        tx,
      );

      return user;
    });

    return {
      userId: createdUser.id,
      role: createdUser.role,
      isNewUser: true,
    };
  }

  private async createSessionAndTokens(
    userId: string,
    role: string,
    deviceId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.sessionsService.getSessionByUserIdAndDeviceId(userId, deviceId);
    const sessionId = session ? session.sessionId : uuidv4();

    const [accessToken, refreshToken] = await Promise.all([
      this.tokensService.generateAccess({ sub: userId, role }),
      this.tokensService.generateRefresh({ sub: userId, sessionId }),
    ]);

    const ctx = Context.getRequired();
    const refreshTokenHash = await this.passwordService.createHash(refreshToken);

    await this.sessionsPolicy.prepareForLogin(userId, deviceId);
    await this.sessionsService.createOrUpdate({
      sessionId,
      userId,
      deviceId,
      refreshTokenHash,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      expiresAt: new Date(Date.now() + parseDuration(this.config.get<string>('session.sessionDuration')!)),
    });

    return { accessToken, refreshToken };
  }

  private buildSuccessRedirectUrl(accessToken: string, isNewUser: boolean, redirectTo?: string): string {
    const baseUrl = this.config.getOrThrow<string>('frontUrl');
    const url = new URL(baseUrl);
    url.pathname = redirectTo ?? '/oauth/callback';
    url.search = '';

    const hashParams = new URLSearchParams({
      accessToken,
      provider: AuthProvider.GOOGLE.toLowerCase(),
      isNewUser: String(isNewUser),
    });

    return `${url.toString()}#${hashParams.toString()}`;
  }

  private normalizeRedirectTo(redirectTo?: string): string | undefined {
    if (!redirectTo) {
      return undefined;
    }

    if (!redirectTo.startsWith('/')) {
      throw new AppGoogleOAuthInvalidStateException('redirectTo must start with /');
    }

    if (redirectTo.startsWith('//')) {
      throw new AppGoogleOAuthInvalidStateException('Invalid redirectTo value');
    }

    return redirectTo;
  }

  private getGoogleOAuthConfig(): GoogleOAuthConfig {
    return {
      clientId: this.config.getOrThrow<string>('googleOAuth.clientId'),
      clientSecret: this.config.getOrThrow<string>('googleOAuth.clientSecret'),
      callbackUrl: this.config.getOrThrow<string>('googleOAuth.callbackUrl'),
    };
  }
}
