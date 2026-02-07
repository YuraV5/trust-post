import { SetMetadata } from '@nestjs/common';
import { UserRoles } from '@prisma/client';

export const ROLES_KEY = 'minRole';

export const Roles = (role: UserRoles): MethodDecorator => SetMetadata(ROLES_KEY, role);
