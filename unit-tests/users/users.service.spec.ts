import { Test, TestingModule } from '@nestjs/testing';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PasswordService } from '../../src/modules/security/services';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { EmailQueueServiceMock, StubAppLogger } from '../__mock__';
import { UsersService } from '../../src/modules/users/services';
import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { LinksService } from '../../src/modules/links/links.service';
import { mockCreateUserInput, mockUser, mockUserAdminOutput, mockUsersRepo } from './__mock__';
import { mockPasswordService } from '../security/mock/password.mock';
import { userAdminMapper, usersAdminMapper } from '../../src/modules/users/mappers';

describe('UsersService', () => {
  let service: UsersService;
  let originalSendAccountActivationEmail: typeof EmailQueueServiceMock.sendAccountActivationEmail;

  beforeEach(async () => {
    originalSendAccountActivationEmail = EmailQueueServiceMock.sendAccountActivationEmail;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: UsersRepo, useValue: mockUsersRepo },
        { provide: LinksService, useValue: jest.fn() },
        { provide: EmailQueueService, useValue: EmailQueueServiceMock },
        { provide: PrismaService, useValue: jest.fn() },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    EmailQueueServiceMock.sendAccountActivationEmail = originalSendAccountActivationEmail;
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

      await expect(service.findById('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should return user profile if found', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);

      const result = await service.findById('existing-id');
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

  // Additional tests for admin methods can be added here
  describe('findByIdForAdmin', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(service.findByIdForAdmin('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should return user for admin if found', async () => {
      mockUsersRepo.findById.mockResolvedValue({ ...mockUserAdminOutput, createdByAdmin: true });
      const result = await service.findByIdForAdmin('existing-id');
      expect(result).toEqual(userAdminMapper({ ...mockUserAdminOutput, createdByAdmin: true }));
    });
  });

  describe('createUserByAdmin', () => {
    it('should throw UserAlreadyExistsError if email is already in use', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);
      await expect(service.createUserByAdmin({ email: 'existing-email', password: 'password' })).rejects.toThrow(
        'User already exists',
      );
    });

    it('should create a new user by admin and return success message', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.createByAdmin.mockResolvedValue({ id: 'new-user-id' });
      mockPasswordService.createHash.mockResolvedValue('hashed-password');

      await expect(service.createUserByAdmin({ email: 'new-email', password: 'password' })).resolves.toEqual({
        message: 'User created successfully, need verification',
      });
      expect(mockUsersRepo.createByAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new-email',
          password: 'hashed-password',
        }),
      );
    });
  });
  it('should handle email sending failure gracefully', async () => {
    mockUsersRepo.findByEmail.mockResolvedValue(null);
    mockUsersRepo.createByAdmin.mockResolvedValue({ id: 'new-user-id' });
    mockPasswordService.createHash.mockResolvedValue('hashed-password');
    const sendEmailMock = jest.fn().mockRejectedValue(new Error('Email service failure'));

    EmailQueueServiceMock.sendAccountActivationEmail = sendEmailMock;
    await expect(service.createUserByAdmin({ email: 'new-email', password: 'password' })).resolves.toEqual({
      message: 'User created successfully, need verification',
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
      await expect(service.activateAccount('existing-id', 'new-password')).resolves.toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update user status successfully', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockUsersRepo.updateStatus.mockResolvedValue(1);

      await expect(service.updateStatus('user-id')).resolves.toEqual({ id: 'user-id', isActive: false });
      expect(mockUsersRepo.updateStatus).toHaveBeenCalledWith('user-id', !mockUser.isActive); // Toggles the status
    });

    it('should throw UserNotFoundError if user is not found for status update', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      await expect(service.updateStatus('nonexistent-id')).rejects.toThrow('User not found');
    });
  });

  describe('deleteMany', () => {
    it('should delete users successfully', async () => {
      mockUsersRepo.deleteMany.mockResolvedValue(2);
      await expect(service.deleteMany(['id1', 'id2'])).resolves.toBeUndefined();
      expect(mockUsersRepo.deleteMany).toHaveBeenCalledWith(['id1', 'id2']);
    });

    it('should throw UserNotFoundError if no users are found for deletion', async () => {
      mockUsersRepo.deleteMany.mockResolvedValue(0);
      await expect(service.deleteMany(['nonexistent-id'])).rejects.toThrow('User not found');
    });
  });

  describe('changeRoles', () => {
    it('should change user role successfully', async () => {
      mockUsersRepo.updateRoles.mockResolvedValue(1);
      await expect(service.changeRoles('user-id', 'ADMIN')).resolves.toEqual({ id: 'user-id', role: 'ADMIN' });
      expect(mockUsersRepo.updateRoles).toHaveBeenCalledWith('user-id', 'ADMIN');
    });

    it('should throw UserNotFoundError if user is not found for role change', async () => {
      mockUsersRepo.updateRoles.mockResolvedValue(0);
      await expect(service.changeRoles('nonexistent-id', 'ADMIN')).rejects.toThrow('User not found');
    });
  });

  describe('findAllForAdmin', () => {
    it('should return paginated users for admin', async () => {
      const mockPaginatedResult = {
        data: [mockUserAdminOutput],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      mockUsersRepo.findAllForAdmin.mockResolvedValue(mockPaginatedResult);
      await expect(service.findAllForAdmin({})).resolves.toEqual({
        ...mockPaginatedResult,
        data: usersAdminMapper(mockPaginatedResult.data),
      });
    });
  });
});
