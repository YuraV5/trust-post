import { Test, TestingModule } from '@nestjs/testing';
import { UserRoles } from '@prisma/client';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { AdminService } from '../../src/modules/admin/services';
import { UsersRepo } from '../../src/modules/users/repo/users-repo';
import { PasswordService } from '../../src/modules/security/services';
import { EmailQueueService } from '../../src/modules/emails/email-queue.service';
import { LinksService } from '../../src/modules/links/links.service';
import { UserRolePeriodService } from '../../src/modules/user-role-periods/services';
import { UserRolePeriodRepo } from '../../src/modules/user-role-periods/repo/user-role-period.repo';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { EmailQueueServiceMock, StubAppLogger } from '../__mock__';
import { mockPasswordService } from '../security/mock/password.mock';
import { mockUser, mockUserAdminOutput, mockUsersRepo } from '../users/__mock';
import { userAdminMapper, usersAdminMapper } from '../../src/modules/users/mappers';

describe('AdminService', () => {
  let service: AdminService;

  const userRolePeriodServiceMock = {
    handleRoleChange: jest.fn(),
    getUserRoleHistory: jest.fn(),
  };

  const userRolePeriodRepoMock = {
    createPeriod: jest.fn(),
  };

  const linksServiceMock = {
    generateTemporaryLink: jest.fn().mockResolvedValue('https://app.local/activate/token-1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersRepo, useValue: mockUsersRepo },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: EmailQueueService, useValue: EmailQueueServiceMock },
        { provide: LinksService, useValue: linksServiceMock },
        { provide: UserRolePeriodService, useValue: userRolePeriodServiceMock },
        { provide: UserRolePeriodRepo, useValue: userRolePeriodRepoMock },
        {
          provide: PrismaService,
          useValue: {
            transaction: jest.fn((cb) => cb({})),
          },
        },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByIdForAdmin', () => {
    it('should throw UserNotFoundError if user is not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);

      await expect(service.findByIdForAdmin('missing-id')).rejects.toThrow('User not found');
    });

    it('should return mapped user if found', async () => {
      mockUsersRepo.findById.mockResolvedValue({ ...mockUserAdminOutput, createdByAdmin: true });

      const result = await service.findByIdForAdmin('user-id');
      expect(result).toEqual(userAdminMapper({ ...mockUserAdminOutput, createdByAdmin: true }));
    });
  });

  describe('createUserByAdmin', () => {
    it('should throw UserAlreadyExistsError if email already exists', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(service.createUserByAdmin({ email: 'test@example.com', password: 'secret123' }, 'admin-id')).rejects.toThrow(
        'User already exists',
      );
    });

    it('should create a user and return success message', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.createByAdmin.mockResolvedValue({ id: 'new-user-id', name: 'Test User' });
      mockPasswordService.createHash.mockResolvedValue('hashed-password');

      await expect(
        service.createUserByAdmin({ email: 'new-user@example.com', password: 'secret123', role: UserRoles.USER }, 'admin-id'),
      ).resolves.toEqual({
        message: 'User created successfully, need verification',
      });

      expect(mockUsersRepo.createByAdmin).toHaveBeenCalled();
      expect(EmailQueueServiceMock.sendAccountActivationEmail).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should throw UserNotFoundError if user is missing', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);

      await expect(service.updateStatus('missing-id')).rejects.toThrow('User not found');
    });

    it('should toggle status and return message', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockUsersRepo.updateStatus.mockResolvedValue(1);

      await expect(service.updateStatus('user-id')).resolves.toEqual({
        message: `Status ${!mockUser.isActive ? 'enabled' : 'disabled'} successfully`,
      });
    });
  });

  describe('changeRoles', () => {
    it('should change role and return success message', async () => {
      mockUsersRepo.findById.mockResolvedValue(mockUser);
      mockUsersRepo.updateRoles.mockResolvedValue(1);

      await expect(service.changeRoles('user-id', 'admin-id', UserRoles.ADMIN)).resolves.toEqual({
        message: 'User roles updated successfully',
      });

      expect(userRolePeriodServiceMock.handleRoleChange).toHaveBeenCalled();
      expect(mockUsersRepo.updateRoles).toHaveBeenCalledWith('user-id', UserRoles.ADMIN);
    });
  });

  describe('deleteMany', () => {
    it('should delete users successfully', async () => {
      mockUsersRepo.deleteMany.mockResolvedValue(2);

      await expect(service.deleteMany(['id1', 'id2'])).resolves.toEqual({ message: 'Deleted 2' });
    });
  });

  describe('findAllForAdmin', () => {
    it('should return paginated mapped users', async () => {
      const mockPaginatedResult = {
        data: [mockUserAdminOutput],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockUsersRepo.findAllForAdmin.mockResolvedValue(mockPaginatedResult);

      await expect(service.findAllForAdmin({})).resolves.toEqual({
        ...mockPaginatedResult,
        data: usersAdminMapper(mockPaginatedResult.data),
      });
    });
  });
});
