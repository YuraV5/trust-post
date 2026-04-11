import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class ExpiredPendingPaymentsCleanupJob {
  private readonly JOB_NAME = 'expired-pending-payments-cleanup';
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('0 1 * * 6', { timeZone: 'Europe/Kyiv' })
  async handle(): Promise<void> {
    const now = new Date();

    const where = {
      status: PaymentStatus.PENDING,
      expiredAt: { lt: now },
      paymentAttempts: { none: {} },
    };

    try {
      const totalCandidates = await this.prisma.payment.count({ where });

      if (totalCandidates === 0) {
        this.logger.debug('No expired pending payments without attempts found', {
          job: this.JOB_NAME,
        });
        return;
      }

      let deletedTotal = 0;

      while (true) {
        const deletedInBatch = await this.prisma.transaction(async (tx) => {
          const candidates = await tx.payment.findMany({
            where,
            select: { id: true },
            orderBy: { expiredAt: 'asc' },
            take: this.BATCH_SIZE,
          });

          if (candidates.length === 0) {
            return 0;
          }

          const ids = candidates.map((item) => item.id);
          const { count } = await tx.payment.deleteMany({
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

        if (deletedInBatch < this.BATCH_SIZE) {
          break;
        }
      }

      this.logger.info('Expired pending payments cleanup completed', {
        job: this.JOB_NAME,
        totalCandidates,
        deletedTotal,
        batchSize: this.BATCH_SIZE,
        cutoffDate: now.toISOString(),
      });
    } catch (error) {
      this.logger.error('Expired pending payments cleanup failed', {
        job: this.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
