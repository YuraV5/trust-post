import { CanActivate, ExecutionContext, Injectable, Type, mixin } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AppNotFoundException, AppForbiddenException } from '../../shared/errors/app-errors';
import { AuthenticatedRequest } from '../interfaces';
import { PrismaClient } from '@prisma/client/extension';

type ResourceModel = 'post' | 'comment' | 'postReview' | 'commentLike' | 'postLike' | 'user' | 'postFile';

const OWNER_FIELD_BY_MODEL: Record<ResourceModel, string> = {
  post: 'authorId',
  comment: 'authorId',
  postReview: 'reviewedById',
  commentLike: 'userId',
  postLike: 'userId',
  user: 'id',
  postFile: 'uploadedById',
};

interface OwnershipGuardOptions {
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

/**
 * Generates a dynamic guard class that checks if the authenticated user
 * owns the resource identified by the route parameter.
 */
export function OwnershipGuard(options: OwnershipGuardOptions): Type<CanActivate> {
  const {
    model,
    ownerField,
    paramKey = 'id',
    bypassRoles = [UserRoles.ADMIN],
    forbiddenMessage,
    notFoundMessage,
  } = options;
  const resolvedOwnerField = ownerField ?? OWNER_FIELD_BY_MODEL[model];

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

      if (!resourceId) {
        throw new AppNotFoundException('Resource ID is required');
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
      const entity = await (this.prisma as PrismaClient)[model].findUnique({
        where: { id: this.convertIdType(resourceId, model) },
        select: { [resolvedOwnerField]: true },
      });

      if (!entity) {
        throw new AppNotFoundException(notFoundMessage || `${this.capitalizeFirst(model)} not found`);
      }

      // Check ownership
      if (entity[resolvedOwnerField] !== user.userId) {
        throw new AppForbiddenException(forbiddenMessage || `You are not allowed to modify this ${model}`);
      }

      return true;
    }

    /**
     * Converts the ID to the appropriate type based on the model.
     * Prisma uses different ID types for different models (string for UUID, number for Int).
     */
    private convertIdType(id: string, model: ResourceModel): string | number {
      // Models with Int ID
      const intIdModels: ResourceModel[] = ['post', 'comment', 'postReview', 'commentLike', 'postLike', 'postFile'];

      if (intIdModels.includes(model)) {
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
