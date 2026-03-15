import { ResponseMessage } from '../../../common/types';
import { SetPassword, UserCredentials, UserLoginOutput, UserRegistration } from '../types';

export interface IAuthService {
  register(inp: UserRegistration): Promise<ResponseMessage>;
  login(inp: UserCredentials): Promise<UserLoginOutput>;
  refresh(userId: string): Promise<{ accessToken: string }>;
  logout(sessionId: string, userId: string): Promise<ResponseMessage>;
  logoutAll(userId: string): Promise<ResponseMessage>;
  resendEmailVerification(email: string): Promise<ResponseMessage>;
  resendPasswordReset(email: string): Promise<ResponseMessage>;
  setPassword(uuid: string, inp: SetPassword): Promise<void>;
  verifyEmail(uuid: string): Promise<void>;
  activateAccount(uuid: string, inp: SetPassword): Promise<ResponseMessage>;
}
