import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/services';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { HashingService, PasswordService, TokensService } from '../../src/modules/security/services';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { ConfigServiceMock, StubAppLogger } from '../__mock__';
import { SessionsService } from '../../src/modules/auth/sessions/services';
import { SessionsPolicy } from '../../src/modules/auth/sessions/services/sessions-polict.service';
import { SessionsRepo } from '../../src/modules/auth/sessions/repo/session-repo';
import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { RedisService } from '../../src/modules/cache/services';
import { RedisConnectionManager } from '../../src/modules/cache/factories/redis-connection.manager';
import { UsersService } from '../../src/modules/users/services';
import { LinksService } from '../../src/modules/links/links.service';
import { mockUsersService } from '../__mock__/users-service.mock';
import { mockPasswordService } from '../security/mock/password.mock';
import { Context } from '../../src/shared/contex/context.service';
import { mockSessionsService } from '../sessions/__mock__';
import { mockTokensService } from '../security/mock/token.mock';
import { mockEmailQueueService } from '../emailQueue/__mock__';
import { mockLinksService } from '../links/__mock__';
import { mockUsersRepo } from '../users/__mock';
import { mockRedisService } from '../redis/__mock__';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokensService, useValue: mockTokensService },
        JwtService,
        { provide: UsersRepo, useValue: mockUsersRepo },
        { provide: PrismaService, useValue: jest.fn() },
        { provide: SessionsService, useValue: mockSessionsService },
        SessionsPolicy,
        SessionsRepo,
        HashingService,
        { provide: LinksService, useValue: mockLinksService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RedisConnectionManager, useValue: { getClient: jest.fn() } },
        {
          provide: EmailQueueService,
          useValue: mockEmailQueueService,
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: ConfigServiceMock },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Мок для ALS/ExecutionContext, щоб login не падав
    jest.spyOn(Context, 'getRequired').mockReturnValue({
      requestId: 'req-123',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      deviceName: 'Test Device',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ userId: '123' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      });

      expect(result).toEqual({ message: 'User registered successfully' });
    });

    it('should not register if user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '123', email: 'test@example.com' });

      await expect(
        service.register({ email: 'test@example.com', password: 'password', name: 'Test User' }),
      ).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        password: 'password',
        isActive: true,
        isEmailVerified: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
        deviceId: 'device123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: '123',
        email: 'test@example.com',
      });
    });

    it('should not login with invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'password', deviceId: 'device123' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      mockUsersService.findAuthUserbyId.mockResolvedValue({ id: '123', email: 'test@example.com' });

      const result = await service.refresh('user-id');
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('logout', () => {
    it('should logout and invalidate the refresh token', async () => {
      mockSessionsService.deleteBySessionId.mockResolvedValue({ message: 'Session deleted' });
      const result = await service.logout('valid-refresh-token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('logoutAll', () => {
    it('should logout from all sessions', async () => {
      mockSessionsService.deleteAllSessions.mockResolvedValue({ message: '3 sessions deleted' });
      const result = await service.logoutAll('user-id');
      expect(result).toEqual({ message: "Logged out from all sessions successfully" });
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend email verification if user exists and is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '123', email: 'test@example.com', isEmailVerified: false });
      mockEmailQueueService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.resendEmailVerification('test@example.com');
      expect(result).toEqual({ message: 'If the email exists, a verification link has been sent' });
    });

    it('should not resend email verification if user is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '123', email: 'test@example.com', isEmailVerified: true });

      const result = await service.resendEmailVerification('test@example.com');
      expect(result).toEqual({ message: 'If the email exists, a verification link has been sent' });
    });

    it('should not resend email verification if user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.resendEmailVerification('test@example.com');
      expect(result).toEqual({ message: 'If the email exists, a verification link has been sent' });
    });
  });
});
