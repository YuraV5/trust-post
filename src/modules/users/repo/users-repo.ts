import { Injectable } from '@nestjs/common';
import { IUserRepo } from '../interfaces';
import { User, UserRoles, Prisma } from '@prisma/client';
import { ModeratorsListOutput, NewUserInput, UpdateUserInput } from '../types';
import { AdminUsersQueryDto } from '../dtos';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../types/paginated';

@Injectable()
export class UsersRepo implements IUserRepo {
  constructor(private readonly db: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return await this.db.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.db.user.findUnique({ where: { id } });
  }

  async create(inp: NewUserInput): Promise<User> {
    return await this.db.user.create({ data: inp });
  }

  async remove(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }

  async update(id: string, inp: UpdateUserInput): Promise<User> {
    return await this.db.user.update({ where: { id }, data: inp });
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { password: newPassword } });
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { isEmailVerified: true } });
  }

  // Admin methods
  async updateStatus(id: string, isActive: boolean): Promise<number> {
    const result = await this.db.user.updateMany({ where: { id }, data: { isActive } });
    return result.count;
  }

  async updateRoles(id: string, role: UserRoles): Promise<number> {
    const result = await this.db.user.updateMany({ where: { id }, data: { role } });
    return result.count;
  }

  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.db.user.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }

  async createByAdmin(inp: NewUserInput, tx?: Prisma.TransactionClient): Promise<User> {
    return await (tx ?? this.db).user.create({
      data: {
        ...inp,
        createdByAdmin: true,
        isActive: false,
        role: inp.role,
      },
    });
  }

  async activateAccount(userId: string, newPassword: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { password: newPassword, isEmailVerified: true, isActive: true },
    });
  }

  async fetchAllModerators(): Promise<ModeratorsListOutput[]> {
    return this.db.user.findMany({
      where: { role: UserRoles.MODERATOR },
      select: { id: true, name: true },
    });
  }

  async findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, email, name, isActive, isEmailVerified, role, sortBy, sortOrder } = query;

    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const where: Prisma.UserWhereInput = {};
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive;
    if (isEmailVerified !== undefined) where.isEmailVerified = isEmailVerified;
    if (role) where.role = role;

    // Fetch paginated data and total count
    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortBy!]: sortOrder! };
    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.db.user.count({ where }),
    ]);

    return {
      data,
      total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
