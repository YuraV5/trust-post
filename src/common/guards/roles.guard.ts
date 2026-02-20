import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoles } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../interfaces';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/app-errors';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private readonly hierarchy: Record<UserRoles, number> = {
    USER: 1,
    MODERATOR: 2,
    ADMIN: 3,
  };

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<UserRoles>(ROLES_KEY, ctx.getHandler());
    if (!requiredRole) return true;

    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;
    if (!user || !user.role) {
      throw new UnauthorizedError();
    }

    if (this.hierarchy[user.role] < this.hierarchy[requiredRole]) {
      throw new ForbiddenError('Insufficient permissions for this resource');
    }

    return true;
  }
}
