import { Module } from '@nestjs/common';
import { SessionsService } from './services/sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsRepo } from './repo/session-repo';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [SecurityModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepo],
  exports: [SessionsService],
})
export class SessionsModule {}
