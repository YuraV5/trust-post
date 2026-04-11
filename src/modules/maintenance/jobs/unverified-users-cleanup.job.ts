import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class UnverifiedUsersCleanupJob {
  private static readonly JOB_NAME = 'unverified-users-cleanup';
  private static readonly BATCH_SIZE = 100;
  private static readonly UNVERIFIED_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('0 1 * * *', { timeZone: 'Europe/Kyiv' })
  async handle(): Promise<void> {
    const cutoffDate = new Date(Date.now() - UnverifiedUsersCleanupJob.UNVERIFIED_TTL_MS);

    try {
      const totalCandidates = await this.prisma.user.count({
        where: {
          isEmailVerified: false,
          createdAt: { lt: cutoffDate },
        },
      });

      if (totalCandidates === 0) {
        this.logger.debug('No unverified users older than 24h found', {
          job: UnverifiedUsersCleanupJob.JOB_NAME,
        });
        return;
      }

      let deletedTotal = 0;

      while (true) {
        const deletedInBatch = await this.prisma.transaction(async (tx) => {
          const candidates = await tx.user.findMany({
            where: {
              isEmailVerified: false,
              createdAt: { lt: cutoffDate },
            },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
            take: UnverifiedUsersCleanupJob.BATCH_SIZE,
          });

          if (candidates.length === 0) {
            return 0;
          }

          const ids = candidates.map((item) => item.id);
          const { count } = await tx.user.deleteMany({
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

        if (deletedInBatch < UnverifiedUsersCleanupJob.BATCH_SIZE) {
          break;
        }
      }

      this.logger.info('Unverified users cleanup completed', {
        job: UnverifiedUsersCleanupJob.JOB_NAME,
        totalCandidates,
        deletedTotal,
        batchSize: UnverifiedUsersCleanupJob.BATCH_SIZE,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      this.logger.error('Unverified users cleanup failed', {
        job: UnverifiedUsersCleanupJob.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
