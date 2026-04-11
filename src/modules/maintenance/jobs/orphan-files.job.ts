import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { CloudinaryClient } from '../../files/services/clients/cloudinary-client.service';
import { FileFolder } from '../../files/types';

@Injectable()
export class OrphanFilesJob {
  private static readonly JOB_NAME = 'orphan-files-cleanup';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryClient,
    private readonly config: ConfigService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'Europe/Kyiv' }) // Run daily at 3:00 AM
  async handle(): Promise<void> {
    const appName = this.config.get<string>('serviceName') || 'trust-post';
    this.logger.info(`Starting orphan files cleanup for folder: ${appName}`, { job: OrphanFilesJob.JOB_NAME });

    let nextCursor: string | undefined;
    let totalChecked = 0;
    let totalDeleted = 0;

    try {
      do {
        // Fetch candidates older than 24h
        const result = await this.cloudinary.findOrphanCandidates(appName, nextCursor);
        const candidates = result.resources;
        nextCursor = result.nextCursor;

        if (!candidates || candidates.length === 0) {
          break;
        }

        totalChecked += candidates.length;
        const orphansToDelete: string[] = [];

        // 1. Filter and process Post files
        const postFileKeys = candidates.map((c) => c.public_id).filter((key) => key.includes(`/${FileFolder.POSTS}/`));

        if (postFileKeys.length > 0) {
          const existingRecords = await this.prisma.postFile.findMany({
            where: { storageKey: { in: postFileKeys } },
            select: { storageKey: true },
          });
          const existingKeysSet = new Set(existingRecords.map((r) => r.storageKey));
          orphansToDelete.push(...postFileKeys.filter((key) => !existingKeysSet.has(key)));
        }

        // 2. Filter and process Chat files
        const chatFileKeys = candidates.map((c) => c.public_id).filter((key) => key.includes(`/${FileFolder.CHATS}/`));

        if (chatFileKeys.length > 0) {
          const existingChatRecords = await this.prisma.messageFile.findMany({
            where: { storageKey: { in: chatFileKeys } },
            select: { storageKey: true },
          });
          const existingChatKeysSet = new Set(existingChatRecords.map((r) => r.storageKey));
          orphansToDelete.push(...chatFileKeys.filter((key) => !existingChatKeysSet.has(key)));
        }

        // 3. Delete gathered orphans in chunks to avoid Cloudinary URL length limits
        if (orphansToDelete.length > 0) {
          const CHUNK_SIZE = 100;
          for (let i = 0; i < orphansToDelete.length; i += CHUNK_SIZE) {
            const chunk = orphansToDelete.slice(i, i + CHUNK_SIZE);
            await this.cloudinary.delete(chunk);
          }

          totalDeleted += orphansToDelete.length;

          this.logger.debug(`Deleted ${orphansToDelete.length} orphan files`, {
            job: OrphanFilesJob.JOB_NAME,
            keys: orphansToDelete,
          });
        }
      } while (nextCursor);

      this.logger.info('Orphan files cleanup completed', {
        job: OrphanFilesJob.JOB_NAME,
        totalChecked,
        totalDeleted,
      });
    } catch (error: unknown) {
      this.logger.error('Orphan files cleanup failed', {
        job: OrphanFilesJob.JOB_NAME,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
