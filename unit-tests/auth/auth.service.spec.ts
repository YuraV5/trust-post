import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../src/modules/auth/services';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { PasswordService, TokensService } from '../../src/modules/security/services';
import { SessionsService } from '../../src/modules/auth/sessions/services';
import { SessionsPolicy } from '../../src/modules/auth/sessions/services/sessions-policy.service';
import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { RedisService } from '../../src/modules/cache/services';
import { UsersService } from '../../src/modules/users/services';
import { LinksService } from '../../src/modules/links/links.service';
import { ConfigServiceMock, mockRedisService, StubAppLogger } from '../__mock__';
import { mockUsersService } from '../__mock__/users-service.mock';
import { mockPasswordService } from '../security/mock/password.mock';
import { mockSessionsService } from '../sessions/__mock__';
import { mockTokensService } from '../security/mock/token.mock';
import { mockEmailQueueService } from '../emailQueue/__mock__';
import { mockLinksService } from '../links/__mock__';

describe('AuthService', () => {
  let service: AuthService;

  const mockSessionsPolicy = {
    prepareForLogin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: SessionsPolicy, useValue: mockSessionsPolicy },
        { provide: LinksService, useValue: mockLinksService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: ConfigServiceMock },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setPassword', () => {
    it('resets password by userId from token and invalidates all sessions', async () => {
      mockRedisService.get = jest.fn().mockResolvedValue('user-123');
      mockUsersService.resetPasswordById.mockResolvedValue(undefined);
      mockSessionsService.deleteAllSessions.mockResolvedValue({ message: 'deleted' });
      mockRedisService.del = jest.fn().mockResolvedValue(1);

      await service.setPassword('token-uuid', {
        email: 'attacker@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      });

      expect(mockUsersService.resetPasswordById).toHaveBeenCalledWith('user-123', 'StrongPassword123!');
      expect(mockUsersService.resetPasswordThroughEmail).not.toHaveBeenCalled();
      expect(mockSessionsService.deleteAllSessions).toHaveBeenCalledWith('user-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('password-reset:token-uuid');
    });

    it('throws for invalid reset token', async () => {
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      await expect(
        service.setPassword('expired-token', {
          email: 'user@example.com',
          password: 'StrongPassword123!',
          confirmPassword: 'StrongPassword123!',
        }),
      ).rejects.toThrow('Invalid or expired password reset link');
    });
  });

  describe('verifyEmail', () => {
    it('marks user email as verified and deletes token', async () => {
      mockRedisService.get = jest.fn().mockResolvedValue('user-321');
      mockUsersService.markEmailAsVerified.mockResolvedValue(undefined);
      mockRedisService.del = jest.fn().mockResolvedValue(1);

      await service.verifyEmail('verify-token');

      expect(mockUsersService.markEmailAsVerified).toHaveBeenCalledWith('user-321');
      expect(mockRedisService.del).toHaveBeenCalledWith('email-verify:verify-token');
    });
  });

  describe('activateAccount', () => {
    it('activates account and invalidates all sessions', async () => {
      mockRedisService.get = jest.fn().mockResolvedValue('user-999');
      mockUsersService.activateAccount.mockResolvedValue({ message: 'Account activated successfully' });
      mockSessionsService.deleteAllSessions.mockResolvedValue({ message: 'deleted' });
      mockRedisService.del = jest.fn().mockResolvedValue(1);

      const result = await service.activateAccount('activate-token', {
        email: 'user@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      });

      expect(mockUsersService.activateAccount).toHaveBeenCalledWith('user-999', 'StrongPassword123!');
      expect(mockSessionsService.deleteAllSessions).toHaveBeenCalledWith('user-999');
      expect(mockRedisService.del).toHaveBeenCalledWith('activate-account:activate-token');
      expect(result).toEqual({ message: 'Account activated successfully, you can now log in' });
    });
  });
});
