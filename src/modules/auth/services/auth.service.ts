import { Inject, Injectable } from '@nestjs/common';
import { IAuthService } from '../interfaces';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { UsersService } from '../../users/users.service';
import { UserCredentials, UserLoginOutput, UserRegistration } from '../types';
import { MessageResponse } from '../../../common/types';
import { BadRequestError } from '../../../shared/errors/app-errors';
import { PasswordService, TokensService } from '../../security/services';
import { UserNotFoundError } from '../../users/errors';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService } from '../sessions/services';
import { SessionsPolicy } from '../sessions/services/sessions-polict.service';
import { Context } from '../../../shared/contex/context.service';
import { ConfigService } from '@nestjs/config';
import { parseDuration } from '../../../common/utils/expiration.util';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokensService: TokensService,
    private readonly sessionsService: SessionsService,
    private readonly sessionsPolicy: SessionsPolicy,
    private readonly config: ConfigService,
  ) {}

  async register(inp: UserRegistration): Promise<MessageResponse> {
    await this.usersService.create({
      email: inp.email,
      password: inp.password,
      name: inp.name,
    });

    this.logger.info(`User ${inp.email} registered`);
    return { message: 'User registered successfully' };
  }

  async login(inp: UserCredentials): Promise<UserLoginOutput> {
    const user = await this.usersService.findByEmail(inp.email);
    if (!user || !user.password) {
      this.logger.warn(`Login failed for ${inp.email}: user not found`);
      throw new UserNotFoundError('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(inp.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed for ${inp.email}: invalid password`);
      throw new BadRequestError('Invalid credentials');
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
}
