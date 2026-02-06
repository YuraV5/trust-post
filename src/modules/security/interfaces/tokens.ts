import { AccessPayload, RefreshPayload } from '../types';

export interface ITokensService {
  generateAccess(payload: AccessPayload): Promise<string>;
  generateRefresh(payload: RefreshPayload): Promise<string>;

  verifyAccess(token: string): Promise<AccessPayload>;
  verifyRefresh(token: string): Promise<RefreshPayload>;
}
