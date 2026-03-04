import { UserRolePeriod, UserRoles, Prisma } from '@prisma/client';

export interface IUserRolePeriodRepo {
  findActiveRolePeriod(userId: string): Promise<UserRolePeriod | null>;
  closeActivePeriod(userId: string, tx?: Prisma.TransactionClient): Promise<void>;
  createPeriod(
    data: {
      userId: string;
      name: string;
      role: UserRoles;
      changedById: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<UserRolePeriod>;
  getUserRoleHistory(userId: string): Promise<UserRolePeriod[]>;
}
