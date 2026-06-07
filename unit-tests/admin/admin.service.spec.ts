/* eslint-disable */
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
import { CommentsService } from '../../src/modules/posts/comments/services/comments.service';
import { PostsQueueService } from '../../src/modules/posts/queue';
import { EmailQueueServiceMock, StubAppLogger } from '../__mock__';
import { mockPasswordService } from '../security/mock/password.mock';
import { mockUser, mockUserAdminOutput, mockUsersRepo } from '../users/__mock';
import { userAdminMapper, usersAdminMapper } from '../../src/modules/users/mappers';
import { Prisma } from '@prisma/client';
import { AdminDashboardRepo } from '../../src/modules/admin/repo/dashboard.repo';

describe('AdminService', () => {
  let service: AdminService;
  let prismaMock: { transaction: jest.Mock<Promise<unknown>, [(tx: Prisma.TransactionClient) => Promise<unknown>]> };
  let transactionUserCountMock: jest.Mock<Promise<number>, []>;

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

  const commentsServiceMock = {
    retryFailedModerationByAdmin: jest.fn(),
  };

  const postsQueueServiceMock = {
    reassignDemotedModeratorPosts: jest.fn(),
  };

  beforeEach(async () => {
    transactionUserCountMock = jest.fn<Promise<number>, []>().mockResolvedValue(1);

    prismaMock = {
      transaction: jest.fn(async (cb: any) =>
        cb({
          user: {
            groupBy: jest.fn().mockResolvedValue([
              { role: UserRoles.ADMIN, _count: 2 },
              { role: UserRoles.MODERATOR, _count: 2 },
            ]),
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminDashboardRepo, useValue: { getDashboardSummary: jest.fn() } },
        { provide: UsersRepo, useValue: mockUsersRepo },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: EmailQueueService, useValue: EmailQueueServiceMock },
        { provide: LinksService, useValue: linksServiceMock },
        { provide: CommentsService, useValue: commentsServiceMock },
        { provide: PostsQueueService, useValue: postsQueueServiceMock },
        { provide: UserRolePeriodService, useValue: userRolePeriodServiceMock },
        { provide: UserRolePeriodRepo, useValue: userRolePeriodRepoMock },
        {
          provide: PrismaService,
          useValue: prismaMock,
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

      await expect(
        service.createUserByAdmin({ email: 'test@example.com', password: 'secret123' }, 'admin-id'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should create a user and return success message', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.createByAdmin.mockResolvedValue({ id: 'new-user-id', name: 'Test User' });
      mockPasswordService.createHash.mockResolvedValue('hashed-password');

      await expect(
        service.createUserByAdmin(
          { email: 'new-user@example.com', password: 'secret123', role: UserRoles.USER },
          'admin-id',
        ),
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

      expect(prismaMock.transaction).toHaveBeenCalledTimes(1);
      expect(userRolePeriodServiceMock.handleRoleChange).toHaveBeenCalled();
      expect(mockUsersRepo.updateRoles).toHaveBeenCalledWith('user-id', UserRoles.ADMIN, expect.anything());
    });

    it('should throw when user not found', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);

      await expect(service.changeRoles('missing-id', 'admin-id', UserRoles.ADMIN)).rejects.toThrow('User not found');

      expect(prismaMock.transaction).not.toHaveBeenCalled();
    });

    it('should enqueue job when moderator changes role', async () => {
      mockUsersRepo.findById.mockResolvedValue({
        ...mockUser,
        role: UserRoles.MODERATOR,
      });

      mockUsersRepo.updateRoles.mockResolvedValue(1);

      await service.changeRoles('user-id', 'admin-id', UserRoles.USER);

      expect(postsQueueServiceMock.reassignDemotedModeratorPosts).toHaveBeenCalledWith('user-id', 'admin-id');
    });

    it('should not enqueue job when user is not moderator', async () => {
      mockUsersRepo.findById.mockResolvedValue({
        ...mockUser,
        role: UserRoles.USER,
      });

      mockUsersRepo.updateRoles.mockResolvedValue(1);

      await service.changeRoles('user-id', 'admin-id', UserRoles.ADMIN);

      expect(postsQueueServiceMock.reassignDemotedModeratorPosts).not.toHaveBeenCalled();
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

  describe('getUserRoleHistory', () => {
    it('should throw UserNotFoundError when user does not exist', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);

      await expect(service.getUserRoleHistory('missing-id')).rejects.toThrow('User not found');
    });

    it('should return role history for existing user', async () => {
      const history = [
        {
          id: 1,
          role: UserRoles.MODERATOR,
          startDate: new Date(),
          endDate: null,
          changedById: 'admin-id',
          createdAt: new Date(),
        },
      ];

      mockUsersRepo.findById.mockResolvedValue(mockUser);
      userRolePeriodServiceMock.getUserRoleHistory.mockResolvedValue(history);

      await expect(service.getUserRoleHistory('user-id')).resolves.toEqual(history);
      expect(userRolePeriodServiceMock.getUserRoleHistory).toHaveBeenCalledWith('user-id');
    });
  });

  describe('retryFailedCommentsModeration', () => {
    it('should queue failed comments moderation retry and return the count', async () => {
      commentsServiceMock.retryFailedModerationByAdmin.mockResolvedValue({ queuedCount: 3 });

      await expect(service.retryFailedCommentsModeration({ limit: 5 }, 'admin-id')).resolves.toEqual({
        message: 'Queued 3 comment(s) for moderation retry',
        queuedCount: 3,
      });

      expect(commentsServiceMock.retryFailedModerationByAdmin).toHaveBeenCalledWith({ limit: 5 }, 'admin-id');
    });
  });
});
