import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { SecurityModule } from '../security/security.module';
import { AuthCookiesService } from './services';
import { SessionsModule } from './sessions/sessions.module';
import { EmailsModule } from '../emails/emails.module';
import { CacheModule } from '../cache/cache.module';
import { LinkService } from './services/link.service';

@Module({
  imports: [UsersModule, AppLoggerModule, SecurityModule, SessionsModule, SessionsModule, EmailsModule, CacheModule],
  controllers: [AuthController],
  providers: [AuthService, AuthCookiesService, LinkService],
})
export class AuthModule {}
