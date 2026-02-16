import { Module } from '@nestjs/common';
import { UsersService } from './services';
import { AdminUsersController, UsersController } from './controllers';
import { SecurityModule } from '../security/security.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { UsersRepo } from './repo/users-repo';

@Module({
  imports: [SecurityModule, AppLoggerModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UsersRepo],
  exports: [UsersService],
})
export class UsersModule {}
