import { EmailData } from '../types';

export const EMAIL_CLIENT = Symbol('EMAIL_CLIENT');

export interface EmailClient {
  send(emailData: EmailData): Promise<unknown>;
}
