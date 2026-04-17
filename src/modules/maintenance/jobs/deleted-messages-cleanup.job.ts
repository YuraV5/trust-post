import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class DeletedMessagesCleanupJob {
  private static readonly JOB_NAME = 'deleted-messages-cleanup';
  private static readonly RETENTION_DAYS = 90;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('15 2 * * *', { timeZone: 'Europe/Kyiv' })
  async handle(): Promise<void> {
    const cutoffDate = new Date(Date.now() - DeletedMessagesCleanupJob.RETENTION_DAYS * 24 * 60 * 60 * 1000);

    try {
      const { count } = await this.prisma.message.deleteMany({
        where: {
          deletedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info('Deleted messages cleanup completed', {
        job: DeletedMessagesCleanupJob.JOB_NAME,
        deletedTotal: count,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: DeletedMessagesCleanupJob.RETENTION_DAYS,
      });
    } catch (error) {
      this.logger.error('Deleted messages cleanup failed', {
        job: DeletedMessagesCleanupJob.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
