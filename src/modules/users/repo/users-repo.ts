import { Injectable } from '@nestjs/common';
import { IUserRepo } from '../interfaces';
import { User } from '@prisma/client';
import { NewUserInput, UpdateUserInput } from '../types';
import { PrismaService } from '../../prisma/prisma.service';

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
    return;
  }

  async update(id: string, inp: UpdateUserInput): Promise<User> {
    return await this.db.user.update({ where: { id }, data: inp });
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { password: newPassword } });
    return;
  }
}
