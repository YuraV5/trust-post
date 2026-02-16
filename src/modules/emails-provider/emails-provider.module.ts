import { Module } from '@nestjs/common';
import { EmailsProviderService } from './services/emails-provider.service';
import { ResendModule } from '../../infrastructure/resend/resend.module';

@Module({
  imports: [ResendModule],
  providers: [EmailsProviderService],
  exports: [EmailsProviderService],
})
export class EmailsProviderModule {}
