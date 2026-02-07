import { MessageResponse } from '../../../common/types';
import { UserCredentials, UserRegistration } from '../types';

export interface IAuthService {
  register(inp: UserRegistration): Promise<MessageResponse>;
  login(inp: UserCredentials): Promise<any>;
}
