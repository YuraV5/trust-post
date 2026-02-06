import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from '../../src/modules/security/services';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateHash', () => {
    it('should generate hash for a value', async () => {
      const value = 'StrongPassword123!';

      const hash = await service.hash(value);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(value); // Hash should not be equal to original value
    });

    it('should generate different hashes for the same value', async () => {
      const value = 'StrongPassword123!';

      const hash1 = await service.hash(value);
      const hash2 = await service.hash(value);

      expect(hash1).not.toBe(hash2); // Different hashes due to salt
    });
  });

  describe('compare', () => {
    it('should return true for matching value and hash', async () => {
      const value = 'StrongPassword123!';
      const hash = await service.hash(value);

      const result = await service.compare(value, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching value and hash', async () => {
      const value = 'StrongPassword123!';
      const wrongValue = 'WrongPassword456!';
      const hash = await service.hash(value);

      const result = await service.compare(wrongValue, hash);

      expect(result).toBe(false);
    });

    it('should return false for empty value', async () => {
      const value = 'StrongPassword123!';
      const hash = await service.hash(value);

      const result = await service.compare('', hash);

      expect(result).toBe(false);
    });
  });
});
