import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { SecurityModule } from '../security/security.module';
import { AuthCookiesService } from './services';

@Module({
  imports: [UsersModule, AppLoggerModule, SecurityModule],
  controllers: [AuthController],
  providers: [AuthService, AuthCookiesService],
})
export class AuthModule {}
