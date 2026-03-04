import { Module } from '@nestjs/common';
import { UnverifiedUsersCleanupJob } from './jobs/unverified-users-cleanup.job';
import { ExpiredSessionsCleanupJob } from './jobs/expired-sessions-cleanup.job';

@Module({
  providers: [UnverifiedUsersCleanupJob, ExpiredSessionsCleanupJob],
})
export class MaintenanceModule {}
