import { MessageResponse } from '../../../common/types';
import { UserCredentials, UserRegistration } from '../types';
import { Response } from 'express';

export interface IAuthService {
  register(inp: UserRegistration): Promise<MessageResponse>;
  login(inp: UserCredentials): Promise<any>;

  setAuthCookies(resp: Response, refreshToken: string): void;
  clearAuthCookies(resp: Response): void;
}
