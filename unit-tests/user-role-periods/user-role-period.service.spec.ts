import { Test, TestingModule } from '@nestjs/testing';
import { UserRoles } from '@prisma/client';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { UserRolePeriodService } from '../../src/modules/user-role-periods/services';
import { UserRolePeriodRepo } from '../../src/modules/user-role-periods/repo/user-role-period.repo';
import { StubAppLogger } from '../__mock__';

describe('UserRolePeriodService', () => {
  let service: UserRolePeriodService;

  const rolePeriodRepoMock = {
    createPeriod: jest.fn(),
    closeActivePeriod: jest.fn(),
    getUserRoleHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolePeriodService,
        { provide: UserRolePeriodRepo, useValue: rolePeriodRepoMock },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<UserRolePeriodService>(UserRolePeriodService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleRoleChange', () => {
    it('should do nothing when role is unchanged (USER -> USER)', async () => {
      await expect(
        service.handleRoleChange({
          userId: 'u1',
          userName: 'user1',
          oldRole: UserRoles.USER,
          newRole: UserRoles.USER,
          changedById: 'admin1',
        }),
      ).resolves.toBeUndefined();

      expect(rolePeriodRepoMock.closeActivePeriod).not.toHaveBeenCalled();
      expect(rolePeriodRepoMock.createPeriod).not.toHaveBeenCalled();
    });

    it('should create period when role changes USER -> MODERATOR', async () => {
      await service.handleRoleChange({
        userId: 'u1',
        userName: 'user1',
        oldRole: UserRoles.USER,
        newRole: UserRoles.MODERATOR,
        changedById: 'admin1',
      });

      expect(rolePeriodRepoMock.createPeriod).toHaveBeenCalledWith(
        {
          userId: 'u1',
          name: 'user1',
          role: UserRoles.MODERATOR,
          changedById: 'admin1',
        },
        undefined,
      );
      expect(rolePeriodRepoMock.closeActivePeriod).not.toHaveBeenCalled();
    });

    it('should close active period when role changes MODERATOR -> USER', async () => {
      await service.handleRoleChange({
        userId: 'u1',
        userName: 'user1',
        oldRole: UserRoles.MODERATOR,
        newRole: UserRoles.USER,
        changedById: 'admin1',
      });

      expect(rolePeriodRepoMock.closeActivePeriod).toHaveBeenCalledWith('u1', undefined);
      expect(rolePeriodRepoMock.createPeriod).not.toHaveBeenCalled();
    });

    it('should switch tracked role when role changes MODERATOR -> ADMIN', async () => {
      const tx = {} as any;

      await service.handleRoleChange(
        {
          userId: 'u1',
          userName: 'user1',
          oldRole: UserRoles.MODERATOR,
          newRole: UserRoles.ADMIN,
          changedById: 'admin1',
        },
        tx,
      );

      expect(rolePeriodRepoMock.closeActivePeriod).toHaveBeenCalledWith('u1', tx);
      expect(rolePeriodRepoMock.createPeriod).toHaveBeenCalledWith(
        {
          userId: 'u1',
          name: 'user1',
          role: UserRoles.ADMIN,
          changedById: 'admin1',
        },
        tx,
      );
    });
  });

  describe('getUserRoleHistory', () => {
    it('should map role history output', async () => {
      const now = new Date();
      rolePeriodRepoMock.getUserRoleHistory.mockResolvedValue([
        {
          id: 1,
          role: UserRoles.MODERATOR,
          startDate: now,
          endDate: null,
          changedById: 'admin1',
          createdAt: now,
        },
      ]);

      const result = await service.getUserRoleHistory('u1');

      expect(result).toEqual([
        {
          id: 1,
          role: UserRoles.MODERATOR,
          startDate: now,
          endDate: null,
          changedById: 'admin1',
          createdAt: now,
        },
      ]);
      expect(rolePeriodRepoMock.getUserRoleHistory).toHaveBeenCalledWith('u1');
    });
  });
});
