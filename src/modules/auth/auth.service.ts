import { Inject, Injectable } from '@nestjs/common';
import { IAuthService } from './interfaces';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { UsersService } from '../users/users.service';
import { UserCredentials, UserLoginOutput, UserRegistration } from './types';
import { MessageResponse } from '../../common/types';
import { BadRequestError } from '../../shared/errors/app-errors';
import { PasswordService, TokensService } from '../security/services';
import { AppNodeMode } from '../../common/consts';
import { JwtToken } from '../security/consts';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundError } from '../users/errors';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService,
    private readonly tokensService: TokensService,
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

    const [accessToken, refreshToken] = await Promise.all([
      this.tokensService.generateAccess({ sub: user.id, role: user.role }),
      this.tokensService.generateRefresh({ sub: user.id }),
    ]);

    this.logger.info(`User ${inp.email} logged in successfully`);

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
    this.logger.info(`Access token refreshed for user ${user.email}`);
    return { accessToken };
  }

  logout(resp: Response): MessageResponse {
    this.clearAuthCookies(resp);
    return { message: 'Logged out successfully' };
  }

  logoutAll(): MessageResponse {
    throw new Error('Method not implemented yet');
  }

  setAuthCookies(resp: Response, refreshToken: string): void {
    const isProduction = this.config.get('nodeEnv') === AppNodeMode.PROD;

    resp.cookie(JwtToken.REFRESH, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    this.logger.debug('Auth cookies set successfully');
  }

  clearAuthCookies(resp: Response): void {
    resp.clearCookie(JwtToken.REFRESH, { path: '/' });
    this.logger.debug('Auth cookies cleared');
  }
}
