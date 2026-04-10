import { ResponseMessage } from '../../../common/types';
import { NewUserInput, UpdatePasswordInput, UpdateUserInput, UserOutput, UserSecuredOutput } from '../types';

export interface IUserService {
  findByEmail(email: string): Promise<UserSecuredOutput | null>;
  getUserById(id: string): Promise<UserOutput>;
  create(inp: NewUserInput): Promise<{ userId: string }>;
  remove(id: string): Promise<ResponseMessage>;
  updateProfile(id: string, inp: UpdateUserInput): Promise<ResponseMessage>;
  updatePassword(id: string, inp: UpdatePasswordInput): Promise<ResponseMessage>;
  findAuthUserById(id: string): Promise<UserSecuredOutput | null>;
  markEmailAsVerified(userId: string): Promise<void>;
  resetPasswordById(userId: string, newPassword: string): Promise<void>;
  resetPasswordThroughEmail(email: string, newPassword: string): Promise<void>;
}
