import { Module } from '@nestjs/common';
import { ResendEmailClient } from './resend-email.client';
import { EMAIL_CLIENT } from '../../modules/emails/emails-provider/interfaces/email-client';

@Module({
  providers: [
    {
      provide: EMAIL_CLIENT,
      useClass: ResendEmailClient,
    },
  ],
  exports: [EMAIL_CLIENT],
})
export class ResendModule {}
