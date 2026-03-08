import { Module } from '@nestjs/common';
import { UnverifiedUsersCleanupJob } from './jobs/unverified-users-cleanup.job';
import { ExpiredSessionsCleanupJob } from './jobs/expired-sessions-cleanup.job';
import { OrphanFilesJob } from './jobs/orphan-files.job';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  providers: [UnverifiedUsersCleanupJob, ExpiredSessionsCleanupJob, OrphanFilesJob],
})
export class MaintenanceModule {}
