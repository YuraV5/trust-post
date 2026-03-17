import { Test, TestingModule } from '@nestjs/testing';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PasswordService } from '../../src/modules/security/services';
import { StubAppLogger } from '../__mock__';
import { UsersService } from '../../src/modules/users/services';
import { mockPasswordService } from '../security/mock/password.mock';
import { mockCreateUserInput, mockUser, mockUsersRepo } from './__mock';
import { UserRoles } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: UsersRepo, useValue: mockUsersRepo },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return null if user is not found', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('test@example.com');
      expect(result).toBeNull();
    });

    it('should return user if found', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should return user profile if found', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('existing-id');
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        isEmailVerified: mockUser.isEmailVerified,
        photoUrl: mockUser.photoUrl,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('create', () => {
    it('should throw UserAlreadyExistsError if email is already in use', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create({ ...mockCreateUserInput, email: 'test@example.com' })).rejects.toThrow(
        'User already exists',
      );
    });

    it('should create a new user and return userId', async () => {
      const input = { ...mockCreateUserInput };
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.create.mockResolvedValue({ id: 'new-user-id' });
      mockPasswordService.createHash.mockResolvedValue('hashed-password');

      const result = await service.create(input);
      expect(result).toEqual({ userId: 'new-user-id' });
      expect(mockUsersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: input.email,
          password: expect.any(String), // Hashed password
          name: expect.any(String), // Generated name
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove user and return success message', async () => {
      const result = await service.remove('user-id');
      expect(result).toEqual({ message: 'Removed successfully' });
      expect(mockUsersRepo.remove).toHaveBeenCalledWith('user-id');
    });
  });

  describe('updateProfile', () => {
    it('should throw BadRequestError if no fields to update', async () => {
      await expect(service.updateProfile('user-id', {})).rejects.toThrow('No fields to update');
    });

    it('should update user profile and return success message', async () => {
      const result = await service.updateProfile('user-id', { name: 'New Name' });
      expect(result).toEqual({ message: 'Updated successfully' });
      expect(mockUsersRepo.update).toHaveBeenCalledWith('user-id', { name: 'new name' });
    });
  });

  describe('updatePassword', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(
        service.updatePassword('nonexistent-id', { currentPassword: 'old', newPassword: 'new' }),
      ).rejects.toThrow('User not found');
    });

    it('should throw BadRequestError if current password is invalid', async () => {
      mockUsersRepo.findById.mockResolvedValue({ ...mockUser, password: 'hashed-password' });
      mockPasswordService.verify.mockResolvedValue(false);
      await expect(service.updatePassword('user-id', { currentPassword: 'wrong', newPassword: 'new' })).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should update password and return success message', async () => {
      mockUsersRepo.findById.mockResolvedValue({ ...mockUser, password: 'hashed-password' });
      mockPasswordService.verify.mockResolvedValue(true);
      mockPasswordService.createHash.mockResolvedValue('new-hashed-password');
      await expect(service.updatePassword('user-id', { currentPassword: 'old', newPassword: 'new' })).resolves.toEqual({
        message: 'Password updated successfully',
      });
    });
  });

  describe('findAuthUserbyId', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(service.findAuthUserbyId('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should return user if found', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      const result = await service.findAuthUserbyId('existing-id');
      expect(result).toEqual(mockUser);
    });
  });

  describe('resetPasswordThroughEmail', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      await expect(service.resetPasswordThroughEmail('nonexistent-email', 'new-password')).rejects.toThrow(
        'User not found',
      );
    });

    it('should reset password successfully', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.createHash.mockResolvedValue('new-hashed-password');
      await expect(service.resetPasswordThroughEmail('existing-email', 'new-password')).resolves.toBeUndefined();
    });
  });

  describe('markEmailAsVerified', () => {
    it('should mark email as verified successfully', async () => {
      await expect(service.markEmailAsVerified('user-id')).resolves.toBeUndefined();
      expect(mockUsersRepo.markEmailAsVerified).toHaveBeenCalledWith('user-id');
    });
  });

  describe('activateAccount', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(service.activateAccount('nonexistent-id', 'new-password')).rejects.toThrow('User not found');
    });

    it('should activate account successfully', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockPasswordService.createHash.mockResolvedValue('new-hashed-password');
      await expect(service.activateAccount('existing-id', 'new-password')).resolves.toEqual({
        message: 'Account activated successfully',
      });
    });
  });

  describe('remove', () => {
    it('should throw UserNotFoundError if user does not exist', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(service.remove('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should remove existing user and return success message', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      const result = await service.remove('user-id');
      expect(result).toEqual({ message: 'Removed successfully' });
      expect(mockUsersRepo.remove).toHaveBeenCalledWith('user-id');
    });
  });

  describe('resetPasswordById', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(service.resetPasswordById('nonexistent-id', 'new-pass')).rejects.toThrow('User not found');
    });

    it('should reset password successfully', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockPasswordService.createHash.mockResolvedValue('hashed-new-pass');
      await expect(service.resetPasswordById('user-id', 'new-pass')).resolves.toBeUndefined();
      expect(mockUsersRepo.updatePassword).toHaveBeenCalledWith('user-id', 'hashed-new-pass');
    });
  });

  describe('fetchAllModerators', () => {
    it('should return empty array and log warning when no moderators found', async () => {
      mockUsersRepo.fetchAllModerators.mockResolvedValue([]);
      const result = await service.fetchAllModerators();
      expect(result).toEqual([]);
    });

    it('should return list of moderators', async () => {
      const moderators = [{ id: 'mod-1', name: 'moderator1' }];
      mockUsersRepo.fetchAllModerators.mockResolvedValue(moderators);
      const result = await service.fetchAllModerators();
      expect(result).toEqual(moderators);
    });
  });

  describe('createByProvider', () => {
    it('should create a user via OAuth provider and return id and role', async () => {
      const createdUser = { ...mockUser, id: 'oauth-user-id', role: 'USER' as UserRoles };
      mockUsersRepo.createByProvider.mockResolvedValue(createdUser);

      const result = await service.createByProvider({
        email: 'oauth@example.com',
        name: 'OAuth User',
        isEmailVerified: true,
      });

      expect(result).toEqual({ id: 'oauth-user-id', role: 'USER' });
      expect(mockUsersRepo.createByProvider).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'oauth@example.com', isEmailVerified: true }),
        undefined,
      );
    });

    it('should generate a random name when name is not provided', async () => {
      const createdUser = { ...mockUser, id: 'oauth-user-id' };
      mockUsersRepo.createByProvider.mockResolvedValue(createdUser);

      await service.createByProvider({ email: 'oauth@example.com' });

      expect(mockUsersRepo.createByProvider).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringMatching(/^user_/) }),
        undefined,
      );
    });
  });

});
