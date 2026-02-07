import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, RefreshTokenRequest } from '../interfaces';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest | RefreshTokenRequest>();
  return request.user;
});
