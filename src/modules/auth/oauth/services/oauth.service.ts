import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { Context } from '../../../../shared/contex/context.service';
import { parseDuration } from '../../../../common/utils';
import { TokensService, PasswordService } from '../../../security/services';
import { UsersService } from '../../../users/services/users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionsService } from '../../sessions/services';
import { SessionsPolicy } from '../../sessions/services/sessions-policy.service';
import { ProviderAccountRepo } from '../repo';
import { OAuthProviderRegistry } from '../registry/oauth-provider.registry';
import { OAuthStateService } from './oauth-state.service';
import type { OAuthCallbackResult, OAuthStatePayload, OAuthTokenResult, OAuthUserProfile } from '../types';
import {
  AppOAuthCodeMissingException,
  AppOAuthInvalidStateException,
  AppOAuthProviderRejectedException,
  AppOAuthAccountConflictException,
  AppOAuthAccountInactiveException,
} from '../errors/oauth.errors';

@Injectable()
export class OAuthService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly registry: OAuthProviderRegistry,
    private readonly stateService: OAuthStateService,
    private readonly providerAccountRepo: ProviderAccountRepo,
    private readonly sessionsService: SessionsService,
    private readonly sessionsPolicy: SessionsPolicy,
    private readonly tokensService: TokensService,
    private readonly passwordService: PasswordService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // Public API
  getRedirectUrl(providerName: string, deviceId: string, redirectTo?: string): string {
    const provider = this.registry.getProvider(providerName.toUpperCase() as AuthProvider);

    const state = this.stateService.sign({
      provider: provider.getProvider(),
      deviceId,
      redirectTo: this.normalizeRedirectTo(redirectTo),
    });

    return provider.getAuthorizationUrl(state);
  }

  async handleCallback(
    providerName: string,
    code: string,
    state: string,
    error?: string,
  ): Promise<OAuthCallbackResult> {
    if (error) {
      this.logger.warn('OAuth provider rejected authorization', {
        context: 'OAuthService.handleCallback',
        provider: providerName,
        error,
      });
      throw new AppOAuthProviderRejectedException(providerName);
    }

    if (!code) throw new AppOAuthCodeMissingException(providerName);

    const statePayload = this.stateService.verify(state);
    this.assertStateProvider(statePayload, providerName);

    const provider = this.registry.getProvider(providerName.toUpperCase() as AuthProvider);
    const providerInfo = await provider.exchangeCode(code);
    const profile = await provider.getUserProfile(providerInfo.accessToken);
    const { userId, role, isNewUser } = await this.resolveOrCreateUser(provider.getProvider(), profile, providerInfo);

    const sessionTokens = await this.createSessionAndTokens(userId, role, statePayload.deviceId);
    const redirectUrl = this.buildRedirectUrl(
      sessionTokens.accessToken,
      provider.getProvider(),
      isNewUser,
      statePayload.redirectTo,
    );

    this.logger.info('OAuth callback handled successfully', {
      context: 'OAuthService.handleCallback',
      provider: providerName,
      userId,
      isNewUser,
    });

    return { ...sessionTokens, isNewUser, redirectUrl };
  }

  // Private helpers
  private assertStateProvider(payload: OAuthStatePayload, expected: string): void {
    const payloadProvider = payload.provider.toLowerCase();

    if (payloadProvider !== expected) {
      throw new AppOAuthInvalidStateException(
        `State provider mismatch: expected "${expected}", got "${payloadProvider}"`,
      );
    }
  }

  private async resolveOrCreateUser(
    provider: AuthProvider,
    profile: OAuthUserProfile,
    authenticationDetails: OAuthTokenResult,
  ): Promise<{ userId: string; role: string; isNewUser: boolean }> {
    const email = profile.email;

    const providerAccount = await this.providerAccountRepo.findByProviderId(provider, profile.providerId);
    if (providerAccount) {
      await this.providerAccountRepo.update(providerAccount.id, {
        providerData: authenticationDetails.providerData,
        accessToken: authenticationDetails.accessToken,
        refreshToken: authenticationDetails.refreshToken,
        tokenExpiresAt: new Date(Date.now() + (authenticationDetails.expiresIn ?? 0) * 1000),
      });

      const existingUser = await this.usersService.findAuthUserbyId(providerAccount.userId);
      if (!existingUser) {
        throw new AppOAuthAccountConflictException('OAuth account is linked to an invalid user');
      }

      if (!existingUser.isActive) throw new AppOAuthAccountInactiveException();

      return { userId: existingUser.id, role: existingUser.role, isNewUser: false };
    }

    // Auto-link by email only when the provider confirmed the address is verified
    if (profile.emailVerified) {
      const existingByEmail = await this.usersService.findByEmail(email);

      if (existingByEmail) {
        if (!existingByEmail.isActive) throw new AppOAuthAccountInactiveException();

        await this.providerAccountRepo.create({
          provider,
          userId: existingByEmail.id,
          providerId: profile.providerId,
          providerData: authenticationDetails.providerData,
          accessToken: authenticationDetails.accessToken,
          refreshToken: authenticationDetails.refreshToken,
          tokenExpiresAt: new Date(Date.now() + (authenticationDetails.expiresIn ?? 0) * 1000),
        });

        return { userId: existingByEmail.id, role: existingByEmail.role, isNewUser: false };
      }
    }

    // First time — create user and link account atomically
    const createdUser = await this.prisma.transaction(async (tx) => {
      const user = await this.usersService.createByProvider(
        {
          email,
          name: profile.name,
          photoUrl: profile.picture,
          isEmailVerified: profile.emailVerified,
        },
        tx,
      );

      await this.providerAccountRepo.create(
        {
          provider,
          userId: user.id,
          providerId: profile.providerId,
          providerData: authenticationDetails.providerData,
          accessToken: authenticationDetails.accessToken,
          refreshToken: authenticationDetails.refreshToken,
          tokenExpiresAt: new Date(Date.now() + (authenticationDetails.expiresIn ?? 0) * 1000),
        },
        tx,
      );

      return user;
    });

    return { userId: createdUser.id, role: createdUser.role, isNewUser: true };
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

  private buildRedirectUrl(
    accessToken: string,
    provider: AuthProvider,
    isNewUser: boolean,
    redirectTo?: string,
  ): string {
    const baseUrl = this.config.getOrThrow<string>('frontUrl');
    const url = new URL(baseUrl);
    url.pathname = redirectTo ?? '/oauth/callback';
    url.search = '';

    const hashParams = new URLSearchParams({
      accessToken,
      provider: provider.toLowerCase(),
      isNewUser: String(isNewUser),
    });

    return `${url.toString()}#${hashParams.toString()}`;
  }

  private normalizeRedirectTo(redirectTo?: string): string | undefined {
    if (!redirectTo) return undefined;

    if (!redirectTo.startsWith('/')) {
      throw new AppOAuthInvalidStateException('redirectTo must start with /');
    }

    if (redirectTo.startsWith('//')) {
      throw new AppOAuthInvalidStateException('Invalid redirectTo value');
    }

    return redirectTo;
  }
}
