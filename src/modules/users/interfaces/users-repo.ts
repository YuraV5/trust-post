import { User, UserRoles } from '@prisma/client';
import { NewUserInput, UpdateUserInput, PaginatedResult } from '../types';
import { AdminUsersQueryDto } from '../dtos';

export interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(inp: NewUserInput): Promise<User>;
  remove(id: string): Promise<void>;
  update(id: string, inp: UpdateUserInput): Promise<User>;
  updatePassword(id: string, newPassword: string): Promise<void>;
  markEmailAsVerified(userId: string): Promise<void>;

  // Admin methods
  updateStatus(id: string, isActive: boolean): Promise<number>;
  findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<User>>;
  updateRoles(id: string, role: UserRoles): Promise<number>;
  deleteMany(ids: string[]): Promise<number>;
}
