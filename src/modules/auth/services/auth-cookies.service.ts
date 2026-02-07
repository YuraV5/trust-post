import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppNodeMode } from "../../../common/consts";
import { JwtToken } from "../../security/consts";
import type { Response } from "express";
import { IAuthCookiesService } from "../interfaces";

@Injectable()
export class AuthCookiesService implements IAuthCookiesService {
  constructor(private config: ConfigService) {}

  setRefresh(resp: Response, token: string): void {
    const isProd = this.config.get('nodeEnv') === AppNodeMode.PROD;

    resp.cookie(JwtToken.REFRESH, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  clear(resp: Response): void {
    resp.clearCookie(JwtToken.REFRESH, { path: '/' });
  }
}