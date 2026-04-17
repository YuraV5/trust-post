import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { EMAIL_JOB } from '../../src/modules/emails/const';
import { StubAppLogger } from '../__mock__';

describe('EmailQueueService', () => {
  const queueMock = { name: 'email-notification-queue', add: jest.fn() };
  const metricsServiceMock = { incrementQueueJobsEnqueued: jest.fn() };

  let service: EmailQueueService;
  let addSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailQueueService(StubAppLogger, queueMock as any, metricsServiceMock as any);
    addSpy = jest.spyOn(service as any, 'add').mockResolvedValue(undefined);
  });

  describe('sendVerificationEmail', () => {
    it('calls add with correct job name, data, and options', async () => {
      const data = { to: 'user@test.com', name: 'John', verificationUrl: 'https://example.com/verify' };

      await service.sendVerificationEmail(data);

      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_JOB.VERIFICATION_EMAIL,
        { to: data.to, name: data.name, verificationUrl: data.verificationUrl },
        expect.objectContaining({
          jobId: `${EMAIL_JOB.VERIFICATION_EMAIL}-${data.to}`,
          priority: 1,
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('calls add with correct job name, data, and options', async () => {
      const data = { to: 'user@test.com', passwordResetUrl: 'https://example.com/reset' };

      await service.sendPasswordResetEmail(data);

      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_JOB.PASSWORD_RESET_EMAIL,
        { to: data.to, passwordResetUrl: data.passwordResetUrl },
        expect.objectContaining({
          jobId: `${EMAIL_JOB.PASSWORD_RESET_EMAIL}-${data.to}`,
          priority: 1,
        }),
      );
    });
  });

  describe('sendAccountActivationEmail', () => {
    it('calls add with correct job name, data, and options', async () => {
      const data = { to: 'user@test.com', activationUrl: 'https://example.com/activate' };

      await service.sendAccountActivationEmail(data);

      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_JOB.ACCOUNT_ACTIVATION_EMAIL,
        { to: data.to, activationUrl: data.activationUrl },
        expect.objectContaining({
          jobId: `${EMAIL_JOB.ACCOUNT_ACTIVATION_EMAIL}-${data.to}`,
          priority: 1,
        }),
      );
    });
  });

  describe('enqueuePostRejectedEmail', () => {
    it('calls add with correct job name, data, and priority 2', async () => {
      const to = 'author@test.com';
      const data = { postTitle: 'My Post', reason: 'Spam content' };

      await service.enqueuePostRejectedEmail(to, data);

      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_JOB.REJECT_POST_EMAIL,
        { to, postTitle: data.postTitle, reason: data.reason },
        expect.objectContaining({
          jobId: `${EMAIL_JOB.REJECT_POST_EMAIL}-${to}`,
          priority: 2,
        }),
      );
    });
  });
});
