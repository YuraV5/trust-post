import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from '../../src/modules/security/services';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate password hash with argon2id', async () => {
      const password = 'StrongPassword123!';

      const hash = await service.createHash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash).toContain('$argon2id$'); // Verify it's using argon2id
    });

    it('should generate different hashes for same password', async () => {
      const password = 'StrongPassword123!';

      const hash1 = await service.createHash(password);
      const hash2 = await service.createHash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+{}[]|:;<>?,.';

      const hash = await service.createHash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'StrongPassword123!';
      const hash = await service.createHash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'StrongPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await service.createHash(password);

      const result = await service.verify(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'StrongPassword123!';
      const hash = await service.createHash(password);

      const result = await service.verify('', hash);

      expect(result).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'StrongPassword123!';
      const hash = await service.createHash(password);

      const result = await service.verify('strongpassword123!', hash);

      expect(result).toBe(false);
    });
  });
});
