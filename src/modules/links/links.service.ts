import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { RedisService } from '../cache/services';
import { v4 as uuidv4 } from 'uuid';
import { type IAppLogger } from '../../shared/logger/intefaces/interface';
import { ILinksService } from './interfaces/links-service';

@Injectable()
export class LinksService implements ILinksService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates a temporary link for a user and stores the associated user ID in Redis with an expiration time.
   * @param userId - User ID to associate with the generated link
   * @param keyPrefix - Part of the path/type of the link, e.g., 'email-verify' or 'password-reset'
   * @param ttlSeconds - Time-to-live for the key in seconds
   */
  async generateTemporaryLink(userId: string, keyPrefix: string, ttlSeconds: number): Promise<string> {
    const token = uuidv4();

    await this.redisService.set(`${keyPrefix}:${token}`, userId, ttlSeconds);

    const baseUrl = this.config.get<string>('frontUrl');
    this.logger.debug(`Generated temporary link ${baseUrl}/${keyPrefix}/${token} for user ${userId}`);

    return `${baseUrl}/${keyPrefix}/${token}`;
  }
}
