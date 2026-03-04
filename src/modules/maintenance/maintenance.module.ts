import { Module } from '@nestjs/common';
import { UnverifiedUsersCleanupJob } from './jobs/unverified-users-cleanup.job';

@Module({
  providers: [UnverifiedUsersCleanupJob],
})
export class MaintenanceModule {}
