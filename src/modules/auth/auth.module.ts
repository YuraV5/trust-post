import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { SecurityModule } from '../security/security.module';
import { AuthCookiesService } from './services';
import { SessionsModule } from './sessions/sessions.module';
import { EmailsModule } from '../emails/emails.module';
import { LinksModule } from '../links/links.module';
import { ProviderAccountRepo } from './oauth/repo';
import { GoogleOAuthProvider } from './oauth/providers/google.provider';
import { OAuthStateService } from './oauth/services/oauth-state.service';
import { OAuthProviderRegistry } from './oauth/registry/oauth-provider.registry';
import { OAuthService } from './oauth/services/oauth.service';
import { OAuthController } from './oauth/controllers/oauth.controller';

@Module({
  imports: [JwtModule, UsersModule, AppLoggerModule, SecurityModule, SessionsModule, EmailsModule, LinksModule],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    AuthCookiesService,
    ProviderAccountRepo,
    GoogleOAuthProvider,
    OAuthStateService,
    OAuthProviderRegistry,
    OAuthService,
  ],
})
export class AuthModule {}
