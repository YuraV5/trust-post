import type { Response } from 'express';

export interface IAuthCookiesService {
  setRefresh(resp: Response, token: string): void
  clear(resp: Response): void;
}
