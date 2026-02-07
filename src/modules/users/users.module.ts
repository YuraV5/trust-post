import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SecurityModule } from '../security/security.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { UsersRepo } from './repo/users-repo';

@Module({
  imports: [SecurityModule, AppLoggerModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepo],
  exports: [UsersService],
})
export class UsersModule {}
