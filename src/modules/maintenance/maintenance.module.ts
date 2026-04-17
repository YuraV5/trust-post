import { Module } from '@nestjs/common';
import {
  ActiveUsersMetricsJob,
  DeletedMessagesCleanupJob,
  ExpiredPendingPaymentsCleanupJob,
  ExpiredSessionsCleanupJob,
  OrphanFilesJob,
  PostsStatusMetricsJob,
  QueueHealthMetricsJob,
  RejectedDeletedCommentsCleanupJob,
  UnverifiedUsersCleanupJob,
} from './jobs';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../posts/comments/comments.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [FilesModule, PrismaModule, MetricsModule, PostsModule, CommentsModule, EmailsModule],
  providers: [
    UnverifiedUsersCleanupJob,
    ExpiredSessionsCleanupJob,
    OrphanFilesJob,
    ExpiredPendingPaymentsCleanupJob,
    RejectedDeletedCommentsCleanupJob,
    DeletedMessagesCleanupJob,
    ActiveUsersMetricsJob,
    PostsStatusMetricsJob,
    QueueHealthMetricsJob,
  ],
})
export class MaintenanceModule {}
