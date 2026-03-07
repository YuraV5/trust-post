import { UserRoles } from '@prisma/client';
import { ResponseMessage } from '../../../common/types';
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
  remove(id: string): Promise<ResponseMessage>;
  updateProfile(id: string, inp: UpdateUserInput): Promise<ResponseMessage>;
  updatePassword(id: string, inp: UpdatePasswordInput): Promise<ResponseMessage>;
  findAuthUserbyId(id: string): Promise<UserSecyredOutput | null>;
  markEmailAsVerified(userId: string): Promise<void>;
  resetPasswordThroughEmail(email: string, newPassword: string): Promise<void>;

  // Admin methods
  findByIdForAdmin(id: string): Promise<UserAdminOutput>;
  createUserByAdmin(inp: CreateByAdminInput, adminId: string): Promise<ResponseMessage>;
  updateStatus(id: string): Promise<ResponseMessage>;
  changeRoles(id: string, userId: string, role: UserRoles): Promise<ResponseMessage>;
  findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>>;
  deleteMany(ids: string[]): Promise<ResponseMessage>;
  getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]>;
}
