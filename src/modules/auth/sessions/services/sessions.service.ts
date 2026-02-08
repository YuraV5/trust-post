import { Inject, Injectable } from '@nestjs/common';
import { ISessionService } from '../interfaces';
import { SessionMapping } from '../types';
import { APP_LOGGER, AppLogger } from '../../../../shared/logger/services/app-logger';
import { SessionsRepo } from '../repo/session-repo';
import { mapSessions } from '../mappers';
import { MessageResponse } from '../../../../common/types';

@Injectable()
export class SessionsService implements ISessionService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly sessionRepo: SessionsRepo,
  ) {}

  async getMySessions(userId: string): Promise<SessionMapping[]> {
    const sessions = await this.sessionRepo.findByUserId(userId);
    if (!sessions.length) {
      this.logger.warn(`No sessions found for user ${userId}`);
      return [];
    }

    return mapSessions(sessions);
  }

  async deleteAllSessions(userId: string): Promise<MessageResponse> {
    const deletedCount = await this.sessionRepo.deleteByUserId(userId);
    if (deletedCount === 0) {
      this.logger.warn(`No sessions deleted for user ${userId}`);
      return { message: 'No sessions found to delete' };
    }
    return { message: `${deletedCount} sessions deleted` };
  }

  async deleteAllExceptCurrentSession(userId: string, currentDeviceId: string): Promise<MessageResponse> {
    const deletedCount = await this.sessionRepo.deleteByUserIdExcept(userId, currentDeviceId);
    if (deletedCount === 0) {
      this.logger.warn(`No sessions deleted for user ${userId} except device ${currentDeviceId}`);
      return { message: 'No other sessions found to delete' };
    }
    return { message: `${deletedCount} sessions deleted, except current session` };
  }

  async setLastUsedTimestamp(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { lastUsedAt: new Date() });
    this.logger.debug(`Updated last used timestamp for session ${sessionId}`);
  }
}
