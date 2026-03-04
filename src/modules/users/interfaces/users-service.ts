import { UserRoles } from '@prisma/client';
import { MessageResponse } from '../../../common/types';
import {
  NewUserInput,
  UpdatePasswordInput,
  UpdateUserInput,
  UserOutput,
  UserSecyredOutput,
  UserAdminOutput,
  CreateByAdminInput,
} from '../types';
import { AdminUsersQueryDto } from '../dtos';
import { PaginatedResult } from '../types/paginated';
import { UserRolePeriodOutput } from '../../user-role-periods/types';

export interface IUserService {
  findByEmail(email: string): Promise<UserSecyredOutput | null>;
  getUserById(id: string): Promise<UserOutput>;
  create(inp: NewUserInput): Promise<{ userId: string }>;
  remove(id: string): Promise<MessageResponse>;
  updateProfile(id: string, inp: UpdateUserInput): Promise<MessageResponse>;
  updatePassword(id: string, inp: UpdatePasswordInput): Promise<MessageResponse>;
  findAuthUserbyId(id: string): Promise<UserSecyredOutput | null>;
  markEmailAsVerified(userId: string): Promise<void>;
  resetPasswordThroughEmail(email: string, newPassword: string): Promise<void>;

  // Admin methods
  findByIdForAdmin(id: string): Promise<UserAdminOutput>;
  createUserByAdmin(inp: CreateByAdminInput, adminId: string): Promise<MessageResponse>;
  updateStatus(id: string): Promise<MessageResponse>;
  changeRoles(id: string, userId: string, role: UserRoles): Promise<MessageResponse>;
  findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>>;
  deleteMany(ids: string[]): Promise<MessageResponse>;
  getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]>;
}
