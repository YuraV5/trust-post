import { UserRoles } from '@prisma/client';
import { MessageResponse } from '../../../common/types';
import {
  NewUserInput,
  UpdatePasswordInput,
  UpdateUserInput,
  UserOutput,
  UserSecyredOutput,
  UserAdminOutput,
} from '../types';
import { AdminUsersQueryDto } from '../dtos';
import { PaginatedResult } from '../types/paginated';

export interface IUserService {
  findByEmail(email: string): Promise<UserSecyredOutput | null>;
  findById(id: string): Promise<UserOutput>;
  create(inp: NewUserInput): Promise<{ userId: string }>;
  remove(id: string): Promise<MessageResponse>;
  updateProfile(id: string, inp: UpdateUserInput): Promise<MessageResponse>;
  updatePassword(id: string, inp: UpdatePasswordInput): Promise<MessageResponse>;
  findAuthUserbyId(id: string): Promise<UserSecyredOutput | null>;
  markEmailAsVerified(userId: string): Promise<void>;
  resetPasswordThroughEmail(email: string, newPassword: string): Promise<void>;

  // Admin methods
  findByIdForAdmin(id: string): Promise<UserAdminOutput>;
  updateStatus(id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }>;
  changeRoles(id: string, role: UserRoles): Promise<{ id: string; role: UserRoles }>;
  findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>>;
  deleteMany(ids: string[]): Promise<void>;
}
