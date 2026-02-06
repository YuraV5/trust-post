import { Module } from '@nestjs/common';
import { HashingService, PasswordService, TokensService } from './services';
import { JwtModule } from '@nestjs/jwt';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';

@Module({
  imports: [JwtModule, AppLoggerModule],
  controllers: [],
  providers: [PasswordService, TokensService, HashingService],
  exports: [PasswordService, TokensService, HashingService],
})
export class SecurityModule {}
