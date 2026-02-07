import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dtos';
import { MessageResponse } from '../../common/types';
import { AuthResponse } from './types';
import type { Response } from 'express';
import { PublicRoute } from '../../common/decorators';
import { RefreshTokenGuard } from '../../common/guards';
import type { RefreshTokenRequest } from '../../common/interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @PublicRoute()
  async register(@Body() inp: RegisterDto): Promise<MessageResponse> {
    return this.authService.register(inp);
  }

  @Post('login')
  @PublicRoute()
  async login(@Body() inp: LoginDto, @Res({ passthrough: true }) resp: Response): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } = await this.authService.login(inp);

    this.authService.setAuthCookies(resp, refreshToken);
    return {
      accessToken,
      user,
    };
  }

  @Post('refresh')
  @PublicRoute()
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken } = await this.authService.refresh(req.user.userId);
    // Re-set the same refresh token cookie to keep it active
    this.authService.setAuthCookies(res, req.refreshToken);

    return { accessToken };
  }

  @Post('logout')
  @UseGuards(RefreshTokenGuard)
  logout(@Res({ passthrough: true }) resp: Response): { message: string } {
    return this.authService.logout(resp);
  }

  @Post('logout-all')
  @UseGuards(RefreshTokenGuard)
  logoutAll(): Promise<MessageResponse> {
    throw new Error('Method not implemented yet');
  }
}
