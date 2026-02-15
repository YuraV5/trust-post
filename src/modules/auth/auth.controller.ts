import { Controller, Post, Body, Res, UseGuards, Req, Get, Param } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginDto, RegisterDto } from './dtos';
import { type MessageResponse } from '../../common/types';
import { AuthResponse } from './types';
import { type Response } from 'express';
import { PublicRoute } from '../../common/decorators';
import { RefreshTokenGuard } from '../../common/guards';
import { type RefreshTokenRequest } from '../../common/interfaces';
import { AuthCookiesService } from './services';
import { ResendVerificationDto, VerifyEmailParamsDto } from './dtos/emailVerify.dto';
import { SetPasswordDto } from './dtos/setPassword.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookiesService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @PublicRoute()
  async register(@Body() inp: RegisterDto): Promise<MessageResponse> {
    return this.authService.register(inp);
  }

  @Post('login')
  @PublicRoute()
  async login(@Body() inp: LoginDto, @Res({ passthrough: true }) resp: Response): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } = await this.authService.login(inp);

    this.cookieService.setRefresh(resp, refreshToken);
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
    this.cookieService.setRefresh(res, req.refreshToken);

    return { accessToken };
  }

  @Post('logout')
  @UseGuards(RefreshTokenGuard)
  async logout(@Req() req: RefreshTokenRequest, @Res({ passthrough: true }) resp: Response): Promise<MessageResponse> {
    const result = await this.authService.logout(req.user.sessionId);
    this.cookieService.clear(resp);
    return result;
  }

  @Post('logout-all')
  @UseGuards(RefreshTokenGuard)
  async logoutAll(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) resp: Response,
  ): Promise<MessageResponse> {
    const result = await this.authService.logoutAll(req.user.userId);
    this.cookieService.clear(resp);
    return result;
  }

  @Get('verify-email/:uuid')
  @PublicRoute()
  async verifyEmail(@Param() params: VerifyEmailParamsDto, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.verifyEmail(params.uuid);
    res.status(302).redirect(`${this.config.get('FRONTEND_URL')}/login#verified`);
  }

  @Post('resend/verification')
  @PublicRoute()
  async resendVerification(@Body() inp: ResendVerificationDto): Promise<MessageResponse> {
    const result = await this.authService.resendEmailVerification(inp.email);
    return result;
  }

  @Post('reset-password')
  @PublicRoute()
  async resetPassword(@Body() inp: ResendVerificationDto): Promise<MessageResponse> {
    const result = await this.authService.resendPasswordReset(inp.email);
    return result;
  }

  @Post('set-password/:uuid')
  @PublicRoute()
  async newPassword(
    @Param() params: VerifyEmailParamsDto,
    @Body() body: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.setPassword(params.uuid, body);
    res.status(302).redirect(`${this.config.get('FRONTEND_URL')}/login#passwordReset`);
  }
}
