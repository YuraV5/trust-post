import { Inject, Injectable } from '@nestjs/common';
import { IAuthService } from '../interfaces';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { SetPassword, UserCredentials, UserLoginOutput, UserRegistration } from '../types';
import { MessageResponse } from '../../../common/types';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { PasswordService, TokensService } from '../../security/services';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService } from '../sessions/services';
import { SessionsPolicy } from '../sessions/services/sessions-polict.service';
import { Context } from '../../../shared/contex/context.service';
import { ConfigService } from '@nestjs/config';
import { parseDuration } from '../../../common/utils/expiration.util';
import { EmailQueueService } from '../../emails/email-queue.service';
import { AppUserAlreadyExistsException } from '../../users/errors';
import { RedisService } from '../../cache/services';
import { REDIS_KEYS } from '../const';
import { UsersService } from '../../users/services';
import { LinksService } from '../../links/links.service';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly emailQueueService: EmailQueueService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokensService: TokensService,
    private readonly sessionsService: SessionsService,
    private readonly sessionsPolicy: SessionsPolicy,
    private readonly config: ConfigService,
    private readonly linkService: LinksService,
    private readonly redisService: RedisService,
  ) {}

  async register(inp: UserRegistration): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(inp.email);
    if (user) {
      this.logger.warn('Registration failed: user already exists');
      throw new AppUserAlreadyExistsException();
    }

    const result = await this.usersService.create({
      email: inp.email,
      password: inp.password,
      name: inp.name,
    });

    try {
      await this.emailQueueService.sendVerificationEmail({
        to: inp.email,
        name: inp.name,
        verificationUrl: await this.linkService.generateTemporaryLink(result.userId, REDIS_KEYS.EMAIL_VERIFY, 3600),
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', {
        context: 'AuthService.register',
        error: error instanceof Error ? error.message : error,
      });
    }

    return { message: 'User registered successfully' };
  }

  async login(inp: UserCredentials): Promise<UserLoginOutput> {
    const user = await this.usersService.findByEmail(inp.email);

    if (!user || !user.password) {
      this.logger.warn('Login failed: invalid credentials');
      throw new AppBadRequestException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(inp.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Login failed: invalid credentials');
      throw new AppBadRequestException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn('Login failed: user not active');
      throw new AppBadRequestException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      this.logger.warn('Login failed: email not verified');
      throw new AppBadRequestException('Verify your email before logging in');
    }

    const session = await this.sessionsService.getSessionByUserIdAndDeviceId(user.id, inp.deviceId);
    const sessionId = session ? session.sessionId : uuidv4();

    const [accessToken, refreshToken] = await Promise.all([
      this.tokensService.generateAccess({ sub: user.id, role: user.role }),
      this.tokensService.generateRefresh({ sub: user.id, sessionId }),
    ]);

    const ctx = Context.getRequired();
    const refreshTokenHash = await this.passwordService.createHash(refreshToken);

    await this.sessionsPolicy.prepareForLogin(user.id, inp.deviceId);
    await this.sessionsService.createOrUpdate({
      sessionId,
      userId: user.id,
      deviceId: inp.deviceId,
      refreshTokenHash,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      expiresAt: new Date(Date.now() + parseDuration(this.config.get<string>('session.expiresInMs')!)),
    });

    this.logger.info(`User ${user.id} logged successfully`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        photoUrl: user.photoUrl,
      },
    };
  }

  async refresh(userId: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findAuthUserbyId(userId);
    if (!user) {
      this.logger.warn('Token refresh failed: user not found');
      throw new AppBadRequestException('Invalid credentials');
    }
    const accessToken = await this.tokensService.generateAccess({ sub: user.id, role: user.role });
    return { accessToken };
  }

  async logout(sessionId: string): Promise<MessageResponse> {
    await this.sessionsService.deleteBySessionId(sessionId);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<MessageResponse> {
    await this.sessionsService.deleteAllSessions(userId);
    return { message: 'Logged out from all sessions successfully' };
  }

  async resendEmailVerification(email: string): Promise<MessageResponse> {
    const message = 'If the email exists, a verification link has been sent';

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user || user.isEmailVerified) {
        return { message };
      }

      const verificationUrl = await this.linkService.generateTemporaryLink(user.id, REDIS_KEYS.EMAIL_VERIFY, 3600);

      await this.emailQueueService.sendVerificationEmail({
        to: email,
        name: user.name,
        verificationUrl,
      });
    } catch (error) {
      this.logger.error('Resend verification failed', { error });
    }

    return { message };
  }

  async resendPasswordReset(email: string): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn('Password reset failed: user not found');
      // Return success to prevent email enumeration
      return { message: 'If the email exists and is verified, a password reset link has been sent' };
    }

    if (!user.isEmailVerified) {
      this.logger.warn('Password reset failed: user email not verified');
      // Return success to prevent email enumeration
      return { message: 'If the email exists and is verified, a password reset link has been sent' };
    }

    try {
      await this.emailQueueService.sendPasswordResetEmail({
        to: email,
        passwordResetUrl: await this.linkService.generateTemporaryLink(user.id, REDIS_KEYS.PASSWORD_RESET, 3600),
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email} for user ${user.id}`, { error });
    }
    return { message: 'If the email exists and is verified, a password reset link has been sent' };
  }

  async setPassword(uuid: string, inp: SetPassword): Promise<void> {
    if (inp.password !== inp.confirmPassword) {
      throw new AppBadRequestException('Passwords do not match');
    }
    const userId = await this.redisService.get(`${REDIS_KEYS.PASSWORD_RESET}:${uuid}`);
    if (!userId) {
      this.logger.warn(`Password reset failed: invalid or expired token ${uuid}`);
      throw new AppBadRequestException('Invalid or expired password reset link');
    }
    await this.usersService.resetPasswordThroughEmail(inp.email, inp.password);
    await this.redisService.del(`${REDIS_KEYS.PASSWORD_RESET}:${uuid}`);
    this.logger.info('Password reset completed successfully');
  }

  async verifyEmail(uuid: string): Promise<void> {
    const userId = await this.redisService.get(`${REDIS_KEYS.EMAIL_VERIFY}:${uuid}`);

    if (!userId) {
      this.logger.warn(`Email verification failed: invalid or expired token ${uuid}`);
      throw new AppBadRequestException('Invalid or expired verification link');
    }
    await this.usersService.markEmailAsVerified(userId);
    await this.redisService.del(`${REDIS_KEYS.EMAIL_VERIFY}:${uuid}`);
    this.logger.info('Email verified successfully');
  }

  async activateAccount(uuid: string, inp: SetPassword): Promise<MessageResponse> {
    if (inp.password !== inp.confirmPassword) {
      throw new AppBadRequestException('Passwords do not match');
    }
    const userId = await this.redisService.get(`${REDIS_KEYS.ACTIVATE_ACCOUNT}:${uuid}`);
    if (!userId) {
      this.logger.warn(`Account activation failed: invalid or expired token ${uuid}`);
      throw new AppBadRequestException('Invalid or expired account activation link');
    }

    await this.usersService.activateAccount(userId, inp.password);
    await this.redisService.del(`${REDIS_KEYS.ACTIVATE_ACCOUNT}:${uuid}`);
    this.logger.info('Account activated successfully');

    return { message: 'Account activated successfully, you can now log in' };
  }
}
