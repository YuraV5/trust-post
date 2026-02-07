import { Injectable, Inject } from '@nestjs/common';
import { JwtService, JsonWebTokenError, TokenExpiredError, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { AppNodeMode } from '../../../common/consts/node-mode';
import { InternalServerError, UnauthorizedError } from '../../../shared/errors/app-errors';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { AccessPayload, RefreshPayload } from '../types';

enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

@Injectable()
export class TokensService {
  private readonly issuer: string;
  private readonly nodeEnv: string;
  private readonly secrets: Record<TokenType, string>;
  private readonly expires: Record<TokenType, StringValue | number>;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly jwt: JwtService,
    readonly config: ConfigService,
  ) {
    this.issuer = config.getOrThrow<string>('jwt.issuer');
    this.nodeEnv = config.getOrThrow<string>('nodeEnv');

    this.secrets = {
      [TokenType.ACCESS]: config.getOrThrow<string>('jwt.accessSecret'),
      [TokenType.REFRESH]: config.getOrThrow<string>('jwt.refreshSecret'),
    };

    this.expires = {
      [TokenType.ACCESS]: config.getOrThrow<StringValue | number>('jwt.accessExpiration'),
      [TokenType.REFRESH]: config.getOrThrow<StringValue | number>('jwt.refreshExpiration'),
    };
  }

  async generateAccess(payload: AccessPayload): Promise<string> {
    return this.signToken(TokenType.ACCESS, payload);
  }

  async generateRefresh(payload: RefreshPayload): Promise<string> {
    return this.signToken(TokenType.REFRESH, payload);
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    return this.verifyToken(TokenType.ACCESS, token) as Promise<AccessPayload>;
  }

  async verifyRefresh(token: string): Promise<RefreshPayload> {
    return this.verifyToken(TokenType.REFRESH, token) as Promise<RefreshPayload>;
  }

  private async signToken(type: TokenType, payload: AccessPayload | RefreshPayload): Promise<string> {
    try {
      const token = await this.jwt.signAsync(payload, this.options(type));
      this.logger.debug(`${type} token generated for subject: ${payload.sub}`);
      return token;
    } catch (err) {
      this.logger.error(`Token generation failed for type: ${type}`, { error: err as Error });
      throw new InternalServerError('Token generation failed');
    }
  }

  private async verifyToken(type: TokenType, token: string): Promise<AccessPayload | RefreshPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload | RefreshPayload>(token, {
        secret: this.secrets[type],
        issuer: this.issuer,
      });
      this.logger.debug(`${type} token verified successfully`);
      return payload;
    } catch (err) {
      this.logger.error(`${type} token verification failed`, {
        error: err as Error,
      });
      throw this.mapJwtError(err);
    }
  }

  private options(type: TokenType): JwtSignOptions {
    return {
      secret: this.secrets[type],
      expiresIn: this.expires[type],
      issuer: this.issuer,
    };
  }

  private mapJwtError(err: unknown): UnauthorizedError {
    if (this.nodeEnv !== AppNodeMode.PROD) {
      if (err instanceof TokenExpiredError) {
        this.logger.debug('JWT expired');
      } else if (err instanceof JsonWebTokenError) {
        this.logger.debug('JWT invalid');
      } else {
        this.logger.error('JWT verification failed', { error: err as Error });
      }
    }

    return new UnauthorizedError('Unauthorized');
  }
}
