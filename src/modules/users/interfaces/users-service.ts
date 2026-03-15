import { ResponseMessage } from '../../../common/types';
import { NewUserInput, UpdatePasswordInput, UpdateUserInput, UserOutput, UserSecyredOutput } from '../types';

export interface IUserService {
  findByEmail(email: string): Promise<UserSecyredOutput | null>;
  getUserById(id: string): Promise<UserOutput>;
  create(inp: NewUserInput): Promise<{ userId: string }>;
  remove(id: string): Promise<ResponseMessage>;
  updateProfile(id: string, inp: UpdateUserInput): Promise<ResponseMessage>;
  updatePassword(id: string, inp: UpdatePasswordInput): Promise<ResponseMessage>;
  findAuthUserbyId(id: string): Promise<UserSecyredOutput | null>;
  markEmailAsVerified(userId: string): Promise<void>;
  resetPasswordById(userId: string, newPassword: string): Promise<void>;
  resetPasswordThroughEmail(email: string, newPassword: string): Promise<void>;
}
