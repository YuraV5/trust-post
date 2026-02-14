export interface IEmailProvider {
  sendEmail(emailData: { to: string; from: string; subject: string; html: string }): Promise<boolean>;
}
