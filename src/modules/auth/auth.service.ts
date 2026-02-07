import { Inject, Injectable } from '@nestjs/common';
import { IAuthService } from './interfaces';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { UsersService } from '../users/users.service';
import { UserCredentials, UserRegistration } from './types';
import { MessageResponse } from '../../common/types';
import { BadRequestError } from '../../shared/errors/app-errors';
import { PasswordService, TokensService } from '../security/services';
import { AppNodeMode } from '../../common/consts';
import { JwtToken } from '../security/consts';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

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

  async login(inp: UserCredentials): Promise<any> {
    const user = await this.usersService.findByEmail(inp.email);
    if (!user || !user.password) {
      this.logger.warn(`Login failed for ${inp.email}: user not found`);
      throw new BadRequestError('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(inp.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed for ${inp.email}: invalid password`);
      throw new BadRequestError('Invalid credentials');
    }

    this.logger.info(`User ${inp.email} logged in successfully`);
    return { message: 'Login successful', userId: user.id };
  }

  setAuthCookies(resp: Response, refreshToken: string): void {
    const isProduction = this.config.get('nodeEnv') === AppNodeMode.PROD;

    resp.cookie(JwtToken.REFRESH, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    this.logger.debug('Auth cookies set successfully');
  }

  clearAuthCookies(resp: Response): void {
    resp.clearCookie(JwtToken.REFRESH);
    this.logger.debug('Auth cookies cleared');
  }
}
