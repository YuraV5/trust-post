import { Module } from '@nestjs/common';
import { EmailsProviderService } from './emails-provider.service';

@Module({
  providers: [EmailsProviderService],
  exports: [EmailsProviderService],
})
export class EmailsProviderModule {}
