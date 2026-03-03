import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppUnauthorizedException  } from '../../src/shared/errors/app-errors';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { mockJwtService } from './mock/token.mock';
import { StubAppLogger } from '../__mock__';
import { TokensService } from '../../src/modules/security/services';

describe('TokensService', () => {
  let service: TokensService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'jwt.issuer': 'test-issuer',
        'jwt.accessSecret': 'test-access-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.accessExpiration': '15m',
        'jwt.refreshExpiration': '7d',
        nodeEnv: 'development',
      };
      return config[key] || null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccess', () => {
    it('should generate valid access token', async () => {
      const mockToken = 'mock-access-token';
      const payload = { sub: 'user-123', role: 'USER' };

      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.generateAccess(payload);

      expect(result).toBe(mockToken);
      expect(mockJwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw InternalServerError on token generation failure', async () => {
      const payload = { sub: 'user-123', role: 'USER' };

      mockJwtService.signAsync.mockRejectedValue(new Error('JWT sign error'));

      await expect(service.generateAccess(payload)).rejects.toThrow('Token generation failed');
    });
  });

  describe('generateRefresh', () => {
    it('should generate valid refresh token', async () => {
      const mockToken = 'mock-refresh-token';
      const payload = { sub: 'user-123', sessionId: 'session-456' };

      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.generateRefresh(payload);

      expect(result).toBe(mockToken);
      expect(mockJwtService.signAsync).toHaveBeenCalled();
    });
  });

  describe('verifyAccess', () => {
    it('should verify valid access token', async () => {
      const mockPayload = { sub: 'user-123', role: 'USER', iat: 1000, exp: 2000, iss: 'test-issuer' };
      const token = 'valid-access-token';

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.verifyAccess(token);

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError on invalid or expired access token', async () => {
      const token = 'invalid-token';

      mockJwtService.verifyAsync.mockRejectedValue(new Error('JWT verification failed'));

      await expect(service.verifyAccess(token)).rejects.toThrow(AppUnauthorizedException );
    });
  });

  describe('verifyRefresh', () => {
    it('should verify valid refresh token', async () => {
      const mockPayload = { sub: 'user-123', sessionId: 'session-456', iat: 1000, exp: 2000, iss: 'test-issuer' };
      const token = 'valid-refresh-token';

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.verifyRefresh(token);

      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedError on invalid refresh token', async () => {
      const token = 'invalid-refresh-token';

      mockJwtService.verifyAsync.mockRejectedValue(new Error('JWT invalid'));

      await expect(service.verifyRefresh(token)).rejects.toThrow(AppUnauthorizedException );
    });
  });
});
