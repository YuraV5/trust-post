import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { RedisService } from '../../cache/services';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LinkService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
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
    return `${baseUrl}/${keyPrefix}/${token}`;
  }
}
