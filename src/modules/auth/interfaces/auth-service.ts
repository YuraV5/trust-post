import { MessageResponse } from '../../../common/types';
import { SetPassword, UserCredentials, UserLoginOutput, UserRegistration } from '../types';

export interface IAuthService {
  register(inp: UserRegistration): Promise<MessageResponse>;
  login(inp: UserCredentials): Promise<UserLoginOutput>;
  refresh(userId: string): Promise<{ accessToken: string }>;
  logout(sessionId: string): Promise<MessageResponse>;
  logoutAll(userId: string): Promise<MessageResponse>;
  resendEmailVerification(email: string): Promise<MessageResponse>;
  resendPasswordReset(email: string): Promise<MessageResponse>;
  setPassword(uuid: string, inp: SetPassword): Promise<void>;
  verifyEmail(uuid: string): Promise<void>;
}
