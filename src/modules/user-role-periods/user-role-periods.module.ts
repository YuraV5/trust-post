import { Module } from '@nestjs/common';
import { UserRolePeriodService } from './services';
import { UserRolePeriodRepo } from './repo/user-role-period.repo';

@Module({
  providers: [UserRolePeriodService, UserRolePeriodRepo],
  exports: [UserRolePeriodService, UserRolePeriodRepo],
})
export class UserRolePeriodsModule {}
