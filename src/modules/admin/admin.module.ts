import { Module } from '@nestjs/common';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { SecurityModule } from '../security/security.module';
import { EmailsModule } from '../emails/emails.module';
import { LinksModule } from '../links/links.module';
import { UserRolePeriodsModule } from '../user-role-periods/user-role-periods.module';
import { AdminUsersController } from './controllers';
import { AdminService } from './services';
import { UsersRepo } from '../users/repo/users-repo';

@Module({
  imports: [AppLoggerModule, SecurityModule, EmailsModule, LinksModule, UserRolePeriodsModule],
  controllers: [AdminUsersController],
  providers: [AdminService, UsersRepo],
  exports: [AdminService],
})
export class AdminModule {}
