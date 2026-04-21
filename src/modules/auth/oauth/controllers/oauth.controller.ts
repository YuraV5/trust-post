import { Controller, Get, Param, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiHeader } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicRoute, DeviceId } from '../../../../common/decorators';
import { AuthCookiesService } from '../../services';
import { OAuthService } from '../services/oauth.service';
import { OAuthStartDto, OAuthCallbackDto } from '../dtos';
import { BadRequestErrorResponse } from '../../../../common/swagger/responses';

@ApiTags('auth-oauth')
@Controller('auth/:provider')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly cookiesService: AuthCookiesService,
  ) {}

  @Get()
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redirect to OAuth provider' })
  @ApiParam({ name: 'provider', type: String, description: 'OAuth provider (google, github, etc)' })
  @ApiHeader({ name: 'x-device-id', description: 'Client device UUID (optional if deviceId query used)', required: false })
  @ApiQuery({ name: 'redirectTo', required: false, type: String })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Redirects to OAuth provider login page',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid provider or parameters',
    type: BadRequestErrorResponse,
  })
  redirect(
    @Param('provider') provider: string,
    @Query() query: OAuthStartDto,
    @DeviceId() deviceId: string,
    @Res() res: Response,
  ): void {
    const url = this.oauthService.getRedirectUrl(provider, deviceId, query.redirectTo);
    res.redirect(url);
  }

  @Get('callback')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth provider callback handler' })
  @ApiParam({ name: 'provider', type: String, description: 'OAuth provider name' })
  @ApiQuery({ name: 'code', required: false, type: String, description: 'Authorization code from provider' })
  @ApiQuery({ name: 'state', required: false, type: String, description: 'State parameter for CSRF protection' })
  @ApiQuery({ name: 'error', required: false, type: String, description: 'Error from provider' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OAuth successful, redirects to frontend with auth token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'OAuth authentication failed',
    type: BadRequestErrorResponse,
  })
  async callback(
    @Param('provider') provider: string,
    @Query() query: OAuthCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.oauthService.handleCallback(provider, query.code ?? '', query.state ?? '', query.error);

    this.cookiesService.setRefresh(res, result.refreshToken);
    res.redirect(result.redirectUrl);
  }
}
