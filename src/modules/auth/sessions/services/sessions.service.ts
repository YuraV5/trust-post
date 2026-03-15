import { Inject, Injectable } from '@nestjs/common';
import { ISessionService } from '../interfaces';
import { SessionMapping, UserSession } from '../types';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { SessionsRepo } from '../repo/session-repo';
import { mapSessions } from '../mappers';
import { HashingService } from '../../../security/services';
import { ResponseMessage } from '../../../../common/types';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { AppForbiddenException } from '../../../../shared/errors/app-errors';
import { SessionNotFoundError } from '../errors/session-not-found';

@Injectable()
export class SessionsService implements ISessionService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
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

  async deleteAllExceptCurrentSession(userId: string, sessionId: string): Promise<ResponseMessage> {
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

  async deleteBySessionId(sessionId: string, userId: string): Promise<ResponseMessage> {
    // Check if session exists and belongs to the user
    const session = await this.sessionRepo.findById(sessionId);

    if (!session) {
      throw new SessionNotFoundError();
    }

    if (session.userId !== userId) {
      throw new AppForbiddenException('You can only delete your own sessions');
    }

    const deletedCount = await this.sessionRepo.deleteByIds([sessionId]);
    if (deletedCount === 0) {
      this.logger.warn(`No session deleted with ID ${sessionId}`);
      return { message: 'No session deleted' };
    }
    this.logger.info('Session deleted');
    return { message: 'Session deleted' };
  }

  async deleteAllSessions(userId: string): Promise<ResponseMessage> {
    const deletedCount = await this.sessionRepo.deleteByUserId(userId);

    if (deletedCount === 0) {
      this.logger.warn(`No sessions deleted for user ${userId}`);
      return { message: 'No sessions deleted' };
    }

    this.logger.info(`${deletedCount} sessions deleted`);
    return { message: `${deletedCount} sessions deleted` };
  }

  async validateSession(sessionId: string, token: string): Promise<boolean> {
    const session = await this.sessionRepo.findActiveById(sessionId);
    if (!session) {
      this.logger.warn(`Session ${sessionId} not found or expired for validation`);
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
