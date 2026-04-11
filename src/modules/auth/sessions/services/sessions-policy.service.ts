import { Inject, Injectable } from '@nestjs/common';
import { SessionsRepo } from '../repo/session-repo';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { ISessionsPolicy } from '../interfaces/session-policy';
import { type IAppLogger } from '../../../../shared/logger/interfaces/interface';

@Injectable()
export class SessionsPolicy implements ISessionsPolicy {
  private readonly MAX_DEVICES = 5;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: SessionsRepo,
  ) {}

  async prepareForLogin(userId: string, deviceId: string): Promise<void> {
    try {
      // enforce max devices limit by deleting oldest sessions if limit exceeded
      const sessions = await this.repo.findByUserId(userId);

      const excess = sessions.length - this.MAX_DEVICES;
      if (excess <= 0) return;

      const idsToDelete = sessions
        .filter((s) => s.deviceId !== deviceId)
        .sort(
          (a, b) =>
            (a.lastUsedAt?.getTime() ?? a.createdAt.getTime()) - (b.lastUsedAt?.getTime() ?? b.createdAt.getTime()),
        )
        .slice(0, excess)
        .map((s) => s.id);

      await this.repo.deleteByIds(idsToDelete);
    } catch (e) {
      this.logger.error(`Session cleanup failed for user ${userId}. Will retry on next login.`, { error: e as Error });
    }
  }
}
