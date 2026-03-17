import { UserRoles } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { UserRolePeriodOutput } from '../types';

/**
 * Provides methods to manage user role periods, including creating new periods when roles change and retrieving role history.
 * Logic:
 * 1. USER → MODERATOR/ADMIN: create a new period
 * 2. MODERATOR ↔ ADMIN: close the previous period, create a new one
 * 3. MODERATOR/ADMIN → USER: close active period
 * 4. USER → USER: do nothing
 */
export interface IUserRolePeriodService {
  handleRoleChange(
    data: {
      userId: string;
      userName: string;
      oldRole: UserRoles;
      newRole: UserRoles;
      changedById: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]>;
}
