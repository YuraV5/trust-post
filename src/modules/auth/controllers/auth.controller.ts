import { Controller, Post, Body, Res, UseGuards, Req, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiHeader } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dtos';
import { type ResponseMessage } from '../../../common/types';
import { AuthResponse } from '../types';
import { type Response } from 'express';
import { PublicRoute, DeviceId } from '../../../common/decorators';
import { RefreshTokenGuard } from '../../../common/guards';
import { type RefreshTokenRequest } from '../../../common/interfaces';
import { AuthCookiesService } from '../services';
import { ResendVerificationDto, VerifyEmailParamsDto } from '../dtos/emailVerify.dto';
import { SetPasswordDto } from '../dtos/setPassword.dto';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  MessageResponseDto,
  BadRequestErrorResponse,
  UnauthorizedErrorResponse,
} from '../../../common/swagger/responses';
import { AuthResponseDto, RefreshTokenResponseDto } from '../dtos/doc.swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookiesService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @PublicRoute()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user already exists',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (3 requests per minute)',
  })
  async register(@Body() inp: RegisterDto): Promise<ResponseMessage> {
    return this.authService.register(inp);
  }

  @Post('login')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'User login with email and password' })
  @ApiHeader({ name: 'x-device-id', description: 'Client device UUID', required: true })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful, access token returned, refresh token in cookie',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or email not verified',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (5 requests per minute)',
  })
  async login(
    @Body() inp: LoginDto,
    @DeviceId() deviceId: string,
    @Res({ passthrough: true }) resp: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken, user } = await this.authService.login({ ...inp, deviceId });

    this.cookieService.setRefresh(resp, refreshToken);
    return {
      accessToken,
      user,
    };
  }

  @Post('refresh')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token generated',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
    type: UnauthorizedErrorResponse,
  })
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful, refresh token cleared',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid refresh token',
    type: UnauthorizedErrorResponse,
  })
  async logout(@Req() req: RefreshTokenRequest, @Res({ passthrough: true }) resp: Response): Promise<ResponseMessage> {
    const result = await this.authService.logout(req.user.sessionId, req.user.userId);
    this.cookieService.clear(resp);
    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout all user sessions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All sessions terminated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid authentication token',
    type: UnauthorizedErrorResponse,
  })
  async logoutAll(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) resp: Response,
  ): Promise<ResponseMessage> {
    const result = await this.authService.logoutAll(req.user.userId);
    this.cookieService.clear(resp);
    return result;
  }

  @Get('verify-email/:uuid')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with UUID token (redirects to frontend)' })
  @ApiParam({ name: 'uuid', type: String, description: 'Email verification token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified, redirects to frontend login page',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired verification token',
    type: BadRequestErrorResponse,
  })
  async verifyEmail(@Param() params: VerifyEmailParamsDto, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.verifyEmail(params.uuid);
    res.status(HttpStatus.FOUND).redirect(`${this.config.get('FRONTEND_URL')}/login#verified`);
  }

  @Post('resend/verification')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email or user already verified',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (3 requests per minute)',
  })
  async resendVerification(@Body() inp: ResendVerificationDto): Promise<ResponseMessage> {
    const result = await this.authService.resendEmailVerification(inp.email);
    return result;
  }

  @Post('reset-password')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email address',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (3 requests per minute)',
  })
  async resetPassword(@Body() inp: ResendVerificationDto): Promise<ResponseMessage> {
    const result = await this.authService.resendPasswordReset(inp.email);
    return result;
  }

  @Post('set-password/:uuid')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set new password with reset token (redirects to frontend)' })
  @ApiParam({ name: 'uuid', type: String, description: 'Password reset token' })
  @ApiBody({ type: SetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password set successfully, redirects to frontend login page',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token, expired token, or weak password',
    type: BadRequestErrorResponse,
  })
  async newPassword(
    @Param() params: VerifyEmailParamsDto,
    @Body() body: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.setPassword(params.uuid, body);
    res.status(HttpStatus.OK).redirect(`${this.config.get('FRONTEND_URL')}/login#passwordReset`);
  }

  @Post('activate-account/:uuid')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user account with token (redirects to frontend)' })
  @ApiParam({ name: 'uuid', type: String, description: 'Account activation token' })
  @ApiBody({ type: SetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account activated successfully, redirects to frontend login page',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired activation token',
    type: BadRequestErrorResponse,
  })
  async activateAccount(
    @Param() params: VerifyEmailParamsDto,
    @Body() body: SetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.activateAccount(params.uuid, body);
    res.status(HttpStatus.OK).redirect(`${this.config.get('FRONTEND_URL')}/login#activated`);
  }
}
