import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class ExpiredSessionsCleanupJob {
  private static readonly JOB_NAME = 'expired-sessions-cleanup';
  private static readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('30 1 * * *', { timeZone: 'Europe/Kyiv' })
  async handle(): Promise<void> {
    const now = new Date();

    try {
      const totalCandidates = await this.prisma.session.count({
        where: {
          expiresAt: { lt: now },
        },
      });

      if (totalCandidates === 0) {
        this.logger.debug('No expired sessions found', {
          job: ExpiredSessionsCleanupJob.JOB_NAME,
        });
        return;
      }

      let deletedTotal = 0;

      while (true) {
        const deletedInBatch = await this.prisma.transaction(async (tx) => {
          const candidates = await tx.session.findMany({
            where: {
              expiresAt: { lt: now },
            },
            select: { id: true },
            orderBy: { expiresAt: 'asc' },
            take: ExpiredSessionsCleanupJob.BATCH_SIZE,
          });

          if (candidates.length === 0) {
            return 0;
          }

          const ids = candidates.map((item) => item.id);
          const { count } = await tx.session.deleteMany({
            where: {
              id: { in: ids },
            },
          });

          return count;
        });

        if (deletedInBatch === 0) {
          break;
        }

        deletedTotal += deletedInBatch;

        if (deletedInBatch < ExpiredSessionsCleanupJob.BATCH_SIZE) {
          break;
        }
      }

      this.logger.info('Expired sessions cleanup completed', {
        job: ExpiredSessionsCleanupJob.JOB_NAME,
        totalCandidates,
        deletedTotal,
        batchSize: ExpiredSessionsCleanupJob.BATCH_SIZE,
        cutoffDate: now.toISOString(),
      });
    } catch (error) {
      this.logger.error('Expired sessions cleanup failed', {
        job: ExpiredSessionsCleanupJob.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
