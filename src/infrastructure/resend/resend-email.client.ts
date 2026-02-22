import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { InvalidEmailConfigError } from '../../modules/emails/emails-provider/errors';
import { EmailClient } from '../../modules/emails/emails-provider/interfaces/email-client';
import { EmailData } from '../../modules/emails/emails-provider/types';

@Injectable()
export class ResendEmailClient implements EmailClient {
  private readonly client: Resend;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('email.resendApiKey');

    if (!apiKey) {
      throw new InvalidEmailConfigError(undefined, ['Resend API key is not configured']);
    }

    this.client = new Resend(apiKey);
  }

  async send(emailData: EmailData): Promise<unknown> {
    return this.client.emails.send(emailData);
  }
}
