import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { InvalidEmailConfigError } from '../../modules/emails-provider/errors';
import { EmailData } from '../../modules/emails-provider/types';
import { EmailClient } from '../../modules/emails-provider/interfaces/email-client';

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
