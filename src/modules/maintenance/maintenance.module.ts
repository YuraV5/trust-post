import { Module } from '@nestjs/common';
import { UnverifiedUsersCleanupJob } from './jobs/unverified-users-cleanup.job';
import { ExpiredSessionsCleanupJob } from './jobs/expired-sessions-cleanup.job';
import { OrphanFilesJob } from './jobs/orphan-files.job';
import { ExpiredPendingPaymentsCleanupJob } from './jobs/expired-pending-payments-cleanup.job';
import { RejectedDeletedCommentsCleanupJob } from './jobs/rejected-deleted-comments-cleanup.job';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsModule } from '../../infrastructure/metrics/metrics.module';
import { ActiveUsersMetricsJob } from './jobs/active-users-metrics.job';
import { PostsStatusMetricsJob } from './jobs/posts-status-metrics.job';
import { QueueHealthMetricsJob } from './jobs/queue-health-metrics.job';
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
    ActiveUsersMetricsJob,
    PostsStatusMetricsJob,
    QueueHealthMetricsJob,
  ],
})
export class MaintenanceModule {}
