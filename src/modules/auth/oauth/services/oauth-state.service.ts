import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { OAuthStatePayload } from '../types';
import { AppOAuthInvalidStateException } from '../errors/oauth.errors';

@Injectable()
export class OAuthStateService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign(payload: OAuthStatePayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.oauthStateSecret'),
      expiresIn: '10m',
      issuer: 'oauth-state',
    });
  }

  verify(token: string): OAuthStatePayload {
    try {
      const decoded = this.jwt.verify<OAuthStatePayload>(token, {
        secret: this.config.getOrThrow<string>('jwt.oauthStateSecret'),
        issuer: 'oauth-state',
      });

      if (!decoded?.deviceId || !decoded?.provider) {
        throw new AppOAuthInvalidStateException('Invalid OAuth state payload');
      }

      return decoded;
    } catch (err) {
      if (err instanceof AppOAuthInvalidStateException) throw err;
      throw new AppOAuthInvalidStateException('Invalid or expired OAuth state');
    }
  }
}
