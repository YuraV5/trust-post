import { MessageResponse } from '../../../common/types';
import { NewUserInput, UpdatePasswordInput, UpdateUserInput, UserOutput, UserSecyredOutput } from '../types';

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
}
