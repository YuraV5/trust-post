import { Inject, Injectable } from '@nestjs/common';
import { SessionsRepo } from '../repo/session-repo';
import { APP_LOGGER, AppLogger } from '../../../../shared/logger/services/app-logger';
import { ISessionsPolicy } from '../interfaces/session-policy';

@Injectable()
export class SessionsPolicy implements ISessionsPolicy {
  private readonly MAX_DEVICES = 5;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly repo: SessionsRepo,
  ) {}

  async prepareForLogin(userId: string, deviceId: string): Promise<void> {
    // one session by device, so delete existing session for this device
    await this.repo.deleteByUserAndDevice(userId, deviceId);

    // check if user has more than allowed sessions and delete excess
    const sessions = await this.repo.findByUserId(userId);

    const excess = sessions.length - this.MAX_DEVICES;
    if (excess <= 0) return;

    const idsToDelete = [...sessions]
      .sort((a, b) => (a.lastUsedAt?.getTime() ?? 0) - (b.lastUsedAt?.getTime() ?? 0))
      .slice(0, excess)
      .map((s) => s.id);

    await this.repo.deleteManyByIds(idsToDelete);

    this.logger.info(`Deleted ${idsToDelete.length} excess sessions for user ${userId}`);
  }
}
