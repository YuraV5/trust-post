import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController, OAuthGoogleController } from './controllers';
import { UsersModule } from '../users/users.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { SecurityModule } from '../security/security.module';
import { AuthCookiesService } from './services';
import { SessionsModule } from './sessions/sessions.module';
import { EmailsModule } from '../emails/emails.module';
import { LinksModule } from '../links/links.module';
import { OAuthGoogleService } from './services/google.service';
import { ProviderAccountRepo } from './repo';

@Module({
  imports: [JwtModule, UsersModule, AppLoggerModule, SecurityModule, SessionsModule, EmailsModule, LinksModule],
  controllers: [AuthController, OAuthGoogleController],
  providers: [AuthService, AuthCookiesService, OAuthGoogleService, ProviderAccountRepo],
})
export class AuthModule {}
