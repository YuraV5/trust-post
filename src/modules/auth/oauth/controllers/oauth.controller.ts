import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PublicRoute } from '../../../../common/decorators';
import { AuthCookiesService } from '../../services';
import { OAuthService } from '../services/oauth.service';
import { OAuthStartDto, OAuthCallbackDto } from '../dtos';

@Controller('auth/:provider')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly cookiesService: AuthCookiesService,
  ) {}

  @Get()
  @PublicRoute()
  redirect(@Param('provider') provider: string, @Query() query: OAuthStartDto, @Res() res: Response): void {
    const url = this.oauthService.getRedirectUrl(provider, query.deviceId, query.redirectTo);
    res.redirect(url);
  }

  @Get('callback')
  @PublicRoute()
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
