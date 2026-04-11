import { Injectable, CanActivate, Inject, ExecutionContext } from '@nestjs/common';
import { TokensService } from '../../modules/security/services';
import { AppUnauthorizedException } from '../../shared/errors/app-errors';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { RefreshTokenRequest } from '../interfaces';
import { SessionsService } from '../../modules/auth/sessions/services';
import { type IAppLogger } from '../../shared/logger/interfaces/interface';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly tokenService: TokensService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RefreshTokenRequest>();
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      this.logger.debug('No refresh token found in cookies');
      throw new AppUnauthorizedException();
    }

    const payload = await this.tokenService.verifyRefresh(refreshToken);
    if (!payload) {
      this.logger.debug('Invalid payload in token');
      throw new AppUnauthorizedException();
    }

    const isSessionValid = await this.sessionsService.validateSession(payload.sessionId, refreshToken);
    if (!isSessionValid) {
      this.logger.debug('Session is invalidated');
      throw new AppUnauthorizedException();
    }

    req.user = {
      userId: payload.sub,
      sessionId: payload.sessionId,
    };
    req.refreshToken = refreshToken;
    return true;
  }
}
