import { Inject, Injectable } from '@nestjs/common';
import { IAuthService } from '../interfaces';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { UsersService } from '../../users/users.service';
import { SetPassword, UserCredentials, UserLoginOutput, UserRegistration } from '../types';
import { MessageResponse } from '../../../common/types';
import { BadRequestError, ForbiddenError } from '../../../shared/errors/app-errors';
import { PasswordService, TokensService } from '../../security/services';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService } from '../sessions/services';
import { SessionsPolicy } from '../sessions/services/sessions-polict.service';
import { Context } from '../../../shared/contex/context.service';
import { ConfigService } from '@nestjs/config';
import { parseDuration } from '../../../common/utils/expiration.util';
import { EmailQueueService } from '../../emails/email-queue.service';
import { UserAlreadyExistsError } from '../../users/errors';
import { RedisService } from '../../cache/services';
import { LinkService } from './link.service';
import { REDIS_KEYS } from '../const';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly emailQueueService: EmailQueueService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokensService: TokensService,
    private readonly sessionsService: SessionsService,
    private readonly sessionsPolicy: SessionsPolicy,
    private readonly config: ConfigService,
    private readonly linkService: LinkService,
    private readonly redisService: RedisService,
  ) {}

  async register(inp: UserRegistration): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(inp.email);
    if (user) {
      this.logger.warn(`Registration failed: user with email ${inp.email} already exists`);
      throw new UserAlreadyExistsError();
    }

    const result = await this.usersService.create({
      email: inp.email,
      password: inp.password,
      name: inp.name,
    });

    this.logger.debug(`User created with ID ${result.userId}, sending verification email...`);

    await this.emailQueueService.sendVerificationEmail({
      to: inp.email,
      name: inp.name,
      verificationUrl: await this.linkService.generateTemporaryLink(result.userId, REDIS_KEYS.EMAIL_VERIFY, 3600),
    });
    this.logger.info(`User ${inp.email} registered`);
    return { message: 'User registered successfully' };
  }

  async login(inp: UserCredentials): Promise<UserLoginOutput> {
    const user = await this.usersService.findByEmail(inp.email);

    if (!user || !user.password) {
      this.logger.warn(`Login failed`, {
        email: inp.email,
        userId: user?.id ?? null,
        isActive: user?.isActive ?? null,
        passwordProvided: Boolean(user?.password),
      });
      throw new BadRequestError('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(inp.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed for ${inp.email}: invalid password`);
      throw new BadRequestError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new BadRequestError('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenError('Email not verified');
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
      deviceName: ctx.deviceName,
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
      this.logger.warn(`Token refresh failed: user ${userId} not found`);
      throw new BadRequestError('Invalid credentials');
    }
    const accessToken = await this.tokensService.generateAccess({ sub: user.id, role: user.role });
    this.logger.debug(`Access token refreshed for user ${user.email}`);
    return { accessToken };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionsService.deleteBySessionId(sessionId);
    this.logger.info(`Session ${sessionId} logged out`);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionsService.deleteAllSessions(userId);
    this.logger.info(`All sessions logged out for user ${userId}`);
  }

  async resendEmailVerification(email: string): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Resend verification failed: user with email ${email} not found`);
      throw new BadRequestError('User not found');
    }
    if (user.isEmailVerified) {
      this.logger.warn(`Resend verification failed: user with email ${email} is already verified`);
      throw new BadRequestError('Email is already verified');
    }

    await this.emailQueueService.sendVerificationEmail({
      to: email,
      name: user.name,
      verificationUrl: await this.linkService.generateTemporaryLink(user.id, REDIS_KEYS.EMAIL_VERIFY, 3600),
    });

    this.logger.info(`Verification email resent to ${user.id}`);
    return { message: 'Verification email resent successfully' };
  }

  async resendPasswordReset(email: string): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Resend password reset failed: user with email ${email} not found`);
      throw new BadRequestError('User not found');
    }

    if (!user.isEmailVerified) {
      this.logger.warn(`Resend password reset failed: user with email ${email} is not verified`);
      throw new BadRequestError('Email is not verified');
    }

    await this.emailQueueService.sendPasswordResetEmail({
      to: email,
      passwordResetUrl: await this.linkService.generateTemporaryLink(user.id, REDIS_KEYS.PASSWORD_RESET, 3600),
    });
    this.logger.info(`Password reset email sent to ${user.id}`);
    return { message: 'Password reset email sent successfully' };
  }

  async setPassword(uuid: string, inp: SetPassword): Promise<void> {
    if (inp.password !== inp.confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }
    const userId = await this.redisService.get(`${REDIS_KEYS.PASSWORD_RESET}:${uuid}`);
    if (!userId) {
      this.logger.warn(`Password reset failed: invalid or expired token ${uuid}`);
      throw new BadRequestError('Invalid or expired password reset link');
    }
    await this.usersService.resetPasswordThroughEmail(inp.email, inp.password);
    await this.redisService.del(`${REDIS_KEYS.PASSWORD_RESET}:${uuid}`);
  }

  async verifyEmail(uuid: string): Promise<void> {
    this.logger.debug(`Verifying email with: ${uuid}`);
    const userId = await this.redisService.get(`${REDIS_KEYS.EMAIL_VERIFY}:${uuid}`);

    if (!userId) {
      this.logger.warn(`Email verification failed: invalid or expired token ${uuid}`);
      throw new BadRequestError('Invalid or expired verification link');
    }
    await this.usersService.markEmailAsVerified(userId);
    await this.redisService.del(`${REDIS_KEYS.EMAIL_VERIFY}:${uuid}`);
  }
}
