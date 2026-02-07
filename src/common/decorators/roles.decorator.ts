import { SetMetadata } from '@nestjs/common';
import { UserRoleTypes } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleTypes[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
