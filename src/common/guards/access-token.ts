import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokensService } from '../../modules/security/services';
import { UnauthorizedError } from '../../shared/errors/app-errors';
import { IS_PUBLIC_KEY } from '../decorators';
import { AuthenticatedRequest } from '../interfaces';
import { UserRoleTypes } from '@prisma/client';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);

    if (isPublic) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.headers['authorization'];

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }
    const token = auth.split(' ')[1];
    const payload = await this.tokenService.verifyAccess(token);

    req.user = {
      userId: payload.sub,
      role: payload.role as UserRoleTypes,
    };
    return true;
  }
}
