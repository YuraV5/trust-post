import { Module } from '@nestjs/common';
import { UsersService } from './services';
import { AdminUsersController, UsersController } from './controllers';
import { SecurityModule } from '../security/security.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { UsersRepo } from './repo/users-repo';
import { LinksModule } from '../links/links.module';
import { EmailsModule } from '../emails/emails.module';
import { UserRolePeriodsModule } from '../user-role-periods/user-role-periods.module';

@Module({
  imports: [SecurityModule, AppLoggerModule, LinksModule, EmailsModule, UserRolePeriodsModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UsersRepo],
  exports: [UsersService],
})
export class UsersModule {}
