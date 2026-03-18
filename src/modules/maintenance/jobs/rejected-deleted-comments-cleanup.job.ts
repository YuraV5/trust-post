import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CommentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

@Injectable()
export class RejectedDeletedCommentsCleanupJob {
  private static readonly JOB_NAME = 'rejected-deleted-comments-cleanup';
  private static readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('0 2 * * 0', { timeZone: 'Europe/Kyiv' })
  async handle(): Promise<void> {
    const where = {
      status: {
        in: [CommentStatus.REJECTED, CommentStatus.DELETED],
      },
    };

    try {
      const totalCandidates = await this.prisma.comment.count({ where });

      if (totalCandidates === 0) {
        this.logger.debug('No rejected or deleted comments found', {
          job: RejectedDeletedCommentsCleanupJob.JOB_NAME,
        });
        return;
      }

      let deletedCommentsTotal = 0;
      let deletedLikesTotal = 0;

      while (true) {
        const batchResult = await this.prisma.$transaction(async (tx) => {
          const candidates = await tx.comment.findMany({
            where,
            select: { id: true },
            orderBy: { updatedAt: 'asc' },
            take: RejectedDeletedCommentsCleanupJob.BATCH_SIZE,
          });

          if (candidates.length === 0) {
            return {
              deletedComments: 0,
              deletedLikes: 0,
            };
          }

          const ids = candidates.map((item) => item.id);

          const { count: deletedLikes } = await tx.commentLike.deleteMany({
            where: {
              commentId: { in: ids },
            },
          });

          const { count: deletedComments } = await tx.comment.deleteMany({
            where: {
              id: { in: ids },
            },
          });

          return {
            deletedComments,
            deletedLikes,
          };
        });

        if (batchResult.deletedComments === 0) {
          break;
        }

        deletedCommentsTotal += batchResult.deletedComments;
        deletedLikesTotal += batchResult.deletedLikes;

        if (batchResult.deletedComments < RejectedDeletedCommentsCleanupJob.BATCH_SIZE) {
          break;
        }
      }

      this.logger.info('Rejected/deleted comments cleanup completed', {
        job: RejectedDeletedCommentsCleanupJob.JOB_NAME,
        totalCandidates,
        deletedCommentsTotal,
        deletedLikesTotal,
        batchSize: RejectedDeletedCommentsCleanupJob.BATCH_SIZE,
      });
    } catch (error) {
      this.logger.error('Rejected/deleted comments cleanup failed', {
        job: RejectedDeletedCommentsCleanupJob.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
