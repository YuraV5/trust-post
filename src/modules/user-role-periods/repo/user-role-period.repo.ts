import { Injectable } from '@nestjs/common';
import { UserRolePeriod, UserRoles, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IUserRolePeriodRepo } from '../interfaces';

@Injectable()
export class UserRolePeriodRepo implements IUserRolePeriodRepo {
  constructor(private readonly db: PrismaService) {}

  async findActiveRolePeriod(userId: string): Promise<UserRolePeriod | null> {
    return await this.db.userRolePeriod.findFirst({
      where: {
        userId,
        endDate: null,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async closeActivePeriod(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.db).userRolePeriod.updateMany({
      where: {
        userId,
        endDate: null,
      },
      data: {
        endDate: new Date(),
      },
    });
  }

  async createPeriod(
    data: {
      userId: string;
      name: string;
      role: UserRoles;
      changedById: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<UserRolePeriod> {
    return await (tx ?? this.db).userRolePeriod.create({
      data: {
        ...data,
        startDate: new Date(),
      },
    });
  }

  async getUserRoleHistory(userId: string): Promise<UserRolePeriod[]> {
    return await this.db.userRolePeriod.findMany({
      where: { userId },
      orderBy: {
        startDate: 'desc',
      },
    });
  }
}
