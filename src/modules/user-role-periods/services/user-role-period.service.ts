import { Injectable, Inject } from '@nestjs/common';
import { Prisma, UserRoles } from '@prisma/client';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { IUserRolePeriodService } from '../interfaces';
import { UserRolePeriodRepo } from '../repo/user-role-period.repo';
import { UserRolePeriodOutput } from '../types';

@Injectable()
export class UserRolePeriodService implements IUserRolePeriodService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: UserRolePeriodRepo,
  ) {}

  async handleRoleChange(
    data: {
      userId: string;
      userName: string;
      oldRole: UserRoles;
      newRole: UserRoles;
      changedById: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const { userId, userName, oldRole, newRole, changedById } = data;

    // If the role did not change, do nothing
    if (oldRole === newRole) {
      this.logger.debug('Role did not change, skipping tracking', { userId, role: oldRole });
      return;
    }

    this.logger.info('Processing role change', {
      userId,
      userName,
      oldRole,
      newRole,
      changedById,
    });

    const isOldRoleTracked = this.isRoleTracked(oldRole);
    const isNewRoleTracked = this.isRoleTracked(newRole);

    // USER → MODERATOR/ADMIN (create new period)
    if (!isOldRoleTracked && isNewRoleTracked) {
      await this.repo.createPeriod(
        {
          userId,
          name: userName,
          role: newRole,
          changedById,
        },
        tx,
      );
      this.logger.info('Created new role period', { userId, role: newRole });
      return;
    }

    // MODERATOR/ADMIN → USER (close active period)
    if (isOldRoleTracked && !isNewRoleTracked) {
      await this.repo.closeActivePeriod(userId, tx);
      this.logger.info('Closed active role period', { userId, oldRole });
      return;
    }

    // MODERATOR ↔ ADMIN (close previous and create new)
    if (isOldRoleTracked && isNewRoleTracked) {
      await this.repo.closeActivePeriod(userId, tx);
      await this.repo.createPeriod(
        {
          userId,
          name: userName,
          role: newRole,
          changedById,
        },
        tx,
      );
      this.logger.info('Switched tracked role', { userId, from: oldRole, to: newRole });
      return;
    }

    // USER → USER (do nothing)
    this.logger.debug('Role change does not involve tracked roles', { userId, oldRole, newRole });
  }

  async getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]> {
    const periods = await this.repo.getUserRoleHistory(userId);
    return periods.map((period) => ({
      id: period.id,
      role: period.role,
      startDate: period.startDate,
      endDate: period.endDate,
      changedById: period.changedById,
      createdAt: period.createdAt,
    }));
  }

  /**
   * Check if the given role is tracked
   * USER is not tracked, MODERATOR and ADMIN are tracked
   */
  private isRoleTracked(role: UserRoles): boolean {
    return role === UserRoles.MODERATOR || role === UserRoles.ADMIN;
  }
}
