import { Injectable, CanActivate, Inject, ExecutionContext } from '@nestjs/common';
import { TokensService } from '../../modules/security/services';
import { UnauthorizedError } from '../../shared/errors/app-errors';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';
import { RefreshTokenRequest } from '../interfaces';
import { SessionsService } from '../../modules/auth/sessions/services';

// TODO add check sessions in db, if session is invalidated, reject the token
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly tokenService: TokensService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RefreshTokenRequest>();
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      this.logger.warn('No refresh token found in cookies');
      throw new UnauthorizedError();
    }

    const payload = await this.tokenService.verifyRefresh(refreshToken);
    if (!payload) {
      this.logger.warn('Invalid payload in token');
      throw new UnauthorizedError();
    }

    const isSessionValid = await this.sessionsService.validateSession(payload.sessionId, refreshToken);
    if (!isSessionValid) {
      this.logger.warn('Session is invalidated');
      throw new UnauthorizedError();
    }

    req.user = {
      userId: payload.sub,
      sessionId: payload.sessionId,
    };
    req.refreshToken = refreshToken;
    return true;
  }
}
