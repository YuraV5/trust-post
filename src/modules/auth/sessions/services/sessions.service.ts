import { Inject, Injectable } from '@nestjs/common';
import { ISessionService } from '../interfaces';
import { SessionMapping, UserSession } from '../types';
import { APP_LOGGER, AppLogger } from '../../../../shared/logger/services/app-logger';
import { SessionsRepo } from '../repo/session-repo';
import { mapSessions } from '../mappers';
import { HashingService } from '../../../security/services';
import { MessageResponse } from '../../../../common/types';

@Injectable()
export class SessionsService implements ISessionService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly sessionRepo: SessionsRepo,
    private readonly hashService: HashingService,
  ) {}

  async getMySessions(userId: string): Promise<SessionMapping[]> {
    const sessions = await this.sessionRepo.findByUserId(userId);
    if (!sessions.length) {
      this.logger.warn(`No sessions found for user ${userId}`);
      return [];
    }

    return mapSessions(sessions);
  }

  async createOrUpdate(data: UserSession): Promise<void> {
    await this.sessionRepo.upsert(data);
  }

  async deleteAllExceptCurrentSession(userId: string, sessionId: string): Promise<MessageResponse> {
    const deletedCount = await this.sessionRepo.deleteSessionsExceptCurrent(userId, sessionId);
    if (deletedCount === 0) {
      this.logger.warn(`No sessions deleted for user ${userId} except ${sessionId}`);
      return { message: 'No sessions deleted' };
    }
    return { message: `${deletedCount} sessions deleted` };
  }

  async setLastUsedTimestamp(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { lastUsedAt: new Date() });
  }

  async deleteBySessionId(sessionId: string): Promise<MessageResponse> {
    const deletedCount = await this.sessionRepo.deleteByIds([sessionId]);
    if (deletedCount === 0) {
      this.logger.warn(`No session deleted with ID ${sessionId}`);
      return { message: 'No session deleted' };
    }
    this.logger.info('Session deleted');
    return { message: 'Session deleted' };
  }

  async deleteAllSessions(userId: string): Promise<MessageResponse> {
    const deletedCount = await this.sessionRepo.deleteByUserId(userId);

    if (deletedCount === 0) {
      this.logger.warn(`No sessions deleted for user ${userId}`);
      return { message: 'No sessions deleted' };
    }

    this.logger.info(`${deletedCount} sessions deleted`);
    return { message: `${deletedCount} sessions deleted` };
  }

  async validateSession(sessionId: string, token: string): Promise<boolean> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      this.logger.warn(`Session ${sessionId} not found for validation`);
      return false;
    }

    const isTokenValid = await this.hashService.compare(token, session.refreshTokenHash);
    if (!isTokenValid) {
      this.logger.warn(`Invalid token for session ${sessionId}`);
      return false;
    }

    return true;
  }

  async getSessionByUserIdAndDeviceId(userId: string, deviceId: string): Promise<{ sessionId: string } | null> {
    const session = await this.sessionRepo.findByUserIdAndDeviceId(userId, deviceId);
    return session ? { sessionId: session.id } : null;
  }
}
