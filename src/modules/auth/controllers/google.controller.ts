import { Controller, Get, Query, Res } from '@nestjs/common';
import { OAuthGoogleService } from '../services/google.service';
import type { Response } from 'express';
import { PublicRoute } from '../../../common/decorators';
import { GoogleOAuthCallbackDto, GoogleOAuthStartDto } from '../dtos/google-oauth.dto';
import { AuthCookiesService } from '../services';

@Controller('auth/google')
export class OAuthGoogleController {
  constructor(
    private readonly oAuthGoogleService: OAuthGoogleService,
    private readonly cookieService: AuthCookiesService,
  ) {}

  @Get()
  @PublicRoute()
  redirectToGoogle(@Query() query: GoogleOAuthStartDto, @Res() res: Response): void {
    const url = this.oAuthGoogleService.redirectToGoogle(query.deviceId, query.redirectTo);
    res.redirect(url);
  }

  @Get('callback')
  @PublicRoute()
  async handleGoogleCallback(@Query() query: GoogleOAuthCallbackDto, @Res() res: Response): Promise<void> {
    const result = await this.oAuthGoogleService.handleGoogleCallback(query.code ?? '', query.state, query.error);
    this.cookieService.setRefresh(res, result.refreshToken);
    res.redirect(result.redirectUrl);
  }
}
