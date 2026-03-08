import { CanActivate, ExecutionContext, Injectable, Type, mixin } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AppNotFoundException, AppForbiddenException } from '../../shared/errors/app-errors';
import { AuthenticatedRequest } from '../interfaces';

type ResourceModel = 'post' | 'comment' | 'postReview' | 'commentLike' | 'postLike' | 'user' | 'postFile';

export interface OwnershipGuardOptions {
  // Name of the Prisma model to check ownership against (e.g., 'post', 'comment')
  model: ResourceModel;

  // Name of the field in the model that references the owner's user ID (default: 'authorId')
  ownerField?: string;

  // Name of the route parameter that contains the resource ID (default: 'id')
  paramKey?: string;

  // Roles that can bypass ownership check (default: [UserRoles.ADMIN])
  bypassRoles?: UserRoles[];

  // Custom error message for ForbiddenException when ownership check fails
  forbiddenMessage?: string;

  // Custom error message for NotFoundException when resource is not found
  notFoundMessage?: string;
}

// This function generates a dynamic guard class based on the provided options. It checks if the authenticated user is the owner of the resource specified by the route parameter.
export function OwnershipGuard(options: OwnershipGuardOptions): Type<CanActivate> {
  const {
    model,
    ownerField = 'authorId',
    paramKey = 'id',
    bypassRoles = [UserRoles.ADMIN],
    forbiddenMessage,
    notFoundMessage,
  } = options;

  @Injectable()
  class OwnershipGuardMixin implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const user = request.user;
      const resourceId = request.params[paramKey];

      // Ensure resourceId is a string, not an array
      if (Array.isArray(resourceId)) {
        throw new AppNotFoundException('Invalid resource ID format');
      }

      // Check if the user is authenticated
      if (!user || !user.userId) {
        throw new AppForbiddenException('User not authenticated');
      }

      // Bypass for certain roles (e.g., ADMIN)
      if (bypassRoles.length > 0 && bypassRoles.includes(user.role)) {
        return true;
      }

      // Check if the resource exists and get the owner field
      const entity = await (this.prisma as any)[model].findUnique({
        where: { id: this.convertIdType(resourceId, model) },
        select: { [ownerField]: true },
      });

      if (!entity) {
        throw new AppNotFoundException(notFoundMessage || `${this.capitalizeFirst(model)} not found`);
      }

      // Check ownership
      if (entity[ownerField] !== user.userId) {
        throw new AppForbiddenException(forbiddenMessage || `You are not allowed to modify this ${model}`);
      }

      return true;
    }

    /**
     * Converts the ID to the appropriate type based on the model.
     * Prisma uses different ID types for different models (string for UUID, number for Int).
     */
    private convertIdType(id: string, model: string): string | number {
      // Models with Int ID
      const intIdModels = ['post', 'comment', 'postReview', 'commentLike', 'postLike'];

      if (intIdModels.includes(model.toLowerCase())) {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) {
          throw new AppNotFoundException(`Invalid ${model} ID format`);
        }
        return numId;
      }

      // By default, string (UUID)
      return id;
    }

    private capitalizeFirst(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }

  return mixin(OwnershipGuardMixin);
}
