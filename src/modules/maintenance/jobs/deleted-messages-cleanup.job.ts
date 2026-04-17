import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class DeletedMessagesCleanupJob {
  private static readonly JOB_NAME = 'deleted-messages-cleanup';
  private static readonly DEFAULT_BATCH_LIMIT = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('15 2 * * 0', { timeZone: 'Europe/Kyiv' })
  async handle(): Promise<void> {
    const batchLimit =
      this.config.get<number>('maintenance.deletedMessagesCleanupBatchLimit') ??
      DeletedMessagesCleanupJob.DEFAULT_BATCH_LIMIT;

    try {
      const batch = await this.prisma.message.findMany({
        where: { isDelete: true },
        select: { id: true },
        orderBy: { deletedAt: 'asc' },
        take: batchLimit,
      });

      if (batch.length === 0) {
        this.logger.debug('No soft-deleted messages found for cleanup', {
          job: DeletedMessagesCleanupJob.JOB_NAME,
          batchLimit,
        });
        return;
      }

      const messageIds = batch.map((item) => item.id);

      const result = await this.prisma.$transaction(async (tx) => {
        const { count: deletedFilesCount } = await tx.chatFile.deleteMany({
          where: {
            messageId: { in: messageIds },
          },
        });

        const { count: deletedMessagesCount } = await tx.message.deleteMany({
          where: {
            id: { in: messageIds },
          },
        });

        return { deletedFilesCount, deletedMessagesCount };
      });

      this.logger.info('Deleted messages cleanup completed', {
        job: DeletedMessagesCleanupJob.JOB_NAME,
        batchLimit,
        selectedMessagesCount: messageIds.length,
        deletedMessagesCount: result.deletedMessagesCount,
        deletedFilesCount: result.deletedFilesCount,
      });
    } catch (error) {
      this.logger.error('Deleted messages cleanup failed', {
        job: DeletedMessagesCleanupJob.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
