import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { LinksService } from '../../src/modules/links/links.service';
import { RedisService } from '../../src/modules/cache/services';
import { StubAppLogger } from '../__mock__';
import { mockRedisService } from '../redis/__mock__';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'token-123'),
}));

describe('LinksService', () => {
  let service: LinksService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        frontUrl: 'https://app.example.com',
      };
      return config[key] ?? null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTemporaryLink', () => {
    it('stores token mapping in redis with ttl and returns generated link', async () => {
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.generateTemporaryLink('user-1', 'email-verify', 3600);

      expect(mockRedisService.set).toHaveBeenCalledWith('email-verify:token-123', 'user-1', 3600);
      expect(result).toBe('https://app.example.com/email-verify/token-123');
    });
  });
});
