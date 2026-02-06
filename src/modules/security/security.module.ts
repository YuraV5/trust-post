import { Module } from '@nestjs/common';
import { HashingService, PasswordService, TokensService } from './services';

@Module({
  controllers: [],
  providers: [PasswordService, TokensService, HashingService],
  exports: [PasswordService, TokensService, HashingService],
})
export class SecurityModule {}
