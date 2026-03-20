import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppForbiddenException } from '../../../shared/errors/app-errors';
import { UserRoles } from '@prisma/client/wasm';

@Injectable()
export class FileOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const body = request.body;

    // admins can delete any file, so we check for that first
    if (user.role === UserRoles.ADMIN) {
      return true;
    }

    const unauthorized = body.keys.filter((key: string) => !key.includes(`/${user.userId}/`));

    if (unauthorized.length > 0) {
      throw new AppForbiddenException('You do not have permission to delete these files');
    }

    return true;
  }
}
