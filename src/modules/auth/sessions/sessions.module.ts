import { Module } from '@nestjs/common';
import { SessionsService } from './services/sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsRepo } from './repo/session-repo';
import { SecurityModule } from '../../security/security.module';
import { SessionsPolicy } from './services/sessions-polict.service';

@Module({
  imports: [SecurityModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepo, SessionsPolicy],
  exports: [SessionsService, SessionsPolicy],
})
export class SessionsModule {}
