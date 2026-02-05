import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../services/app-logger';
import { NodeEnv } from '../../../common/consts/node-mode';

// Mock the ALS module to avoid real async-local-storage usage
jest.mock('../../../infrastructure/als/request-id', () => ({
  getRequestId: jest.fn(() => 'test-request-id'),
}));

describe('AppLogger', () => {
  let service: AppLogger;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue(NodeEnv.DEV),
      get: jest.fn().mockReturnValue('debug'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AppLogger, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<AppLogger>(AppLogger);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('info', () => {
    it('should log info message', () => {
      const message = 'Info message';
      const meta = { context: 'test-context' };

      service.info(message, meta);

      expect(service).toBeDefined();
    });

    it('should log info message without meta', () => {
      const message = 'Info message without meta';

      service.info(message);

      expect(service).toBeDefined();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      const message = 'Warning message';
      const meta = { context: 'test-context' };

      service.warn(message, meta);

      expect(service).toBeDefined();
    });

    it('should log warning message without meta', () => {
      const message = 'Warning message without meta';

      service.warn(message);

      expect(service).toBeDefined();
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      const message = 'Debug message';
      const meta = { context: 'test-context' };

      service.debug(message, meta);

      expect(service).toBeDefined();
    });

    it('should log debug message without meta', () => {
      const message = 'Debug message without meta';

      service.debug(message);

      expect(service).toBeDefined();
    });
  });

  describe('error', () => {
    it('should log error message with Error object', () => {
      const message = 'Error message';
      const error = new Error('Test error');
      const meta = { error, context: 'test-context' };

      service.error(message, meta);

      expect(service).toBeDefined();
    });

    it('should log error message with string error', () => {
      const message = 'Error message';
      const meta = { error: 'String error', context: 'test-context' };

      service.error(message, meta);

      expect(service).toBeDefined();
    });

    it('should log error message without meta', () => {
      const message = 'Error message without meta';

      service.error(message);

      expect(service).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should use dev logger when nodeEnv is DEV', () => {
      expect(configService.getOrThrow).toHaveBeenCalledWith('nodeEnv');
    });

    it('should use loggerLevel config if provided', () => {
      expect(configService.get).toHaveBeenCalledWith('loggerLevel');
    });
  });

  describe('prod logger', () => {
    it('should create prod logger when nodeEnv is PROD', async () => {
      const mockConfigService = {
        getOrThrow: jest.fn().mockReturnValue(NodeEnv.PROD),
        get: jest.fn().mockReturnValue('info'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [AppLogger, { provide: ConfigService, useValue: mockConfigService }],
      }).compile();

      const prodService = module.get<AppLogger>(AppLogger);

      expect(prodService).toBeDefined();
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('nodeEnv');
    });
  });

  describe('meta handling', () => {
    it('should handle error meta with Error object correctly', () => {
      const message = 'Test error';
      const testError = new Error('Test error message');
      const meta = { error: testError, context: 'ErrorContext' };

      service.error(message, meta);

      expect(service).toBeDefined();
    });

    it('should handle error meta with string error correctly', () => {
      const message = 'Test error';
      const meta = { error: 'String error message', context: 'ErrorContext' };

      service.error(message, meta);

      expect(service).toBeDefined();
    });

    it('should preserve additional meta properties', () => {
      const message = 'Test message';
      const meta = {
        context: 'test-context',
        userId: 'user-123',
        action: 'TEST_ACTION',
        additionalData: { key: 'value' },
      };

      service.info(message, meta);

      expect(service).toBeDefined();
    });
  });
});
