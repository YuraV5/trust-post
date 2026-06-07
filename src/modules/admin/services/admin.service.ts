import { Inject, Injectable } from '@nestjs/common';
import { PostStatus, UserRoles } from '@prisma/client';
import { ResponseMessage } from '../../../common/types';
import { generateRandomUsername } from '../../../common/utils/generate-name.util';
import { AppUserAlreadyExistsException, AppUserNotFoundException } from '../../users/errors';
import { UsersRepo } from '../../users/repo/users-repo';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { PasswordService } from '../../security/services';
import { CreateByAdminInput, ModeratorsListOutput, UserAdminOutput } from '../../users/types';
import { userAdminMapper, usersAdminMapper } from '../../users/mappers';
import { AdminUsersQueryDto } from '../../users/dtos';
import { PaginatedResult } from '../../users/types/paginated';
import { UserRolePeriodService } from '../../user-role-periods/services';
import { UserRolePeriodOutput } from '../../user-role-periods/types';
import { UserRolePeriodRepo } from '../../user-role-periods/repo/user-role-period.repo';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../emails/email-queue.service';
import { LinksService } from '../../links/links.service';
import { REDIS_KEYS } from '../../auth/const';
import { CommentsService } from '../../posts/comments/services/comments.service';
import { RetryFailedCommentsInput } from '../../posts/comments/types';
import { PostsQueueService } from '../../posts/queue';
import { AppBadRequestException } from '../../../shared/errors/app-errors';

export type AdminDashboardUsersInfo = {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  byRole: Record<UserRoles, number>;
};

export type AdminDashboardPostStatusInfo = {
  status: PostStatus;
  count: number;
};

export type AdminDashboardModeratorLoad = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  pendingReviewCount: number;
  blockedCount: number;
  totalOnReview: number;
};

export type AdminDashboardPostsInfo = {
  totalPosts: number;
  byStatus: AdminDashboardPostStatusInfo[];
  moderators: AdminDashboardModeratorLoad[];
};

export type AdminDashboardRoleHistoryInfo = {
  totalEntries: number;
  latestChangedAt: Date | null;
};

export type AdminDashboardOutput = {
  usersInfo: AdminDashboardUsersInfo;
  postsInfo: AdminDashboardPostsInfo;
  userRolesInfo: AdminDashboardRoleHistoryInfo;
};

export type AdminRoleHistoryEntryOutput = {
  id: number;
  userId: string;
  userName: string;
  userEmail: string | null;
  role: UserRoles;
  startDate: Date;
  endDate: Date | null;
  changedById: string;
  changedByName: string | null;
  createdAt: Date;
};

@Injectable()
export class AdminService {
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly usersRepo: UsersRepo,
    private readonly passwordService: PasswordService,
    private readonly emailQueueService: EmailQueueService,
    private readonly linksService: LinksService,
    private readonly commentsService: CommentsService,
    private readonly postsQueueService: PostsQueueService,
    private readonly userRolePeriodService: UserRolePeriodService,
    private readonly userRolePeriodRepo: UserRolePeriodRepo,
    private readonly prismaService: PrismaService,
  ) {}

  async findByIdForAdmin(id: string): Promise<UserAdminOutput> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    return userAdminMapper(user);
  }

  async createUserByAdmin(inp: CreateByAdminInput, adminId: string): Promise<ResponseMessage> {
    const existingUser = await this.usersRepo.findByEmail(inp.email);
    if (existingUser) {
      throw new AppUserAlreadyExistsException();
    }

    const name = inp.name ? inp.name.toLowerCase() : generateRandomUsername();
    const hashedPassword = await this.passwordService.createHash(inp.password);
    inp.password = hashedPassword;

    const user = await this.prismaService.transaction(async (tx) => {
      const createdUser = await this.usersRepo.createByAdmin({ ...inp, name }, tx);

      if (inp.role && inp.role !== UserRoles.USER) {
        await this.userRolePeriodRepo.createPeriod(
          {
            userId: createdUser.id,
            name: createdUser.name,
            role: inp.role,
            changedById: adminId,
          },
          tx,
        );
      }

      return createdUser;
    });

    try {
      await this.emailQueueService.sendAccountActivationEmail({
        to: inp.email,
        activationUrl: await this.linksService.generateTemporaryLink(user.id, REDIS_KEYS.ACTIVATE_ACCOUNT, 3600),
      });
    } catch (error) {
      this.logger.error(`Failed to send account activation email to ${inp.email} for user ${user.id}`, {
        error: error as Error,
      });
    }

    return { message: 'User created successfully, need verification' };
  }

  async updateStatus(id: string): Promise<ResponseMessage> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const isActive = !user.isActive;
    const result = await this.usersRepo.updateStatus(id, isActive);
    if (result === 0) {
      throw new AppUserNotFoundException();
    }

    return { message: `Status ${isActive ? 'enabled' : 'disabled'} successfully` };
  }

  async changeRoles(id: string, changedById: string, role: UserRoles): Promise<ResponseMessage> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const result = await this.prismaService.transaction(async (tx) => {
      const isPrivilegedRole = user.role === UserRoles.ADMIN || user.role === UserRoles.MODERATOR;
      const isDemotionToUser = role === UserRoles.USER;

      if (isPrivilegedRole && isDemotionToUser) {
        const adminCount = await tx.user.count({
          where: {
            id: {
              not: id,
            },
            role: UserRoles.ADMIN,
          },
        });

        const moderatorCount = await tx.user.count({
          where: {
            id: {
              not: id,
            },
            role: UserRoles.MODERATOR,
          },
        });

        const isLastAdmin = user.role === UserRoles.ADMIN && adminCount === 0;

        const isLastModerator = user.role === UserRoles.MODERATOR && moderatorCount === 0;

        if (isLastAdmin || isLastModerator) {
          throw new AppBadRequestException(
            'At least one admin or moderator must remain assigned. Assign a new admin or moderator before changing this role.',
          );
        }
      }

      await this.userRolePeriodService.handleRoleChange(
        {
          userId: id,
          userName: user.name,
          oldRole: user.role,
          newRole: role,
          changedById,
        },
        tx,
      );

      return this.usersRepo.updateRoles(id, role, tx);
    });

    if (result === 0) {
      throw new AppUserNotFoundException();
    }

    if (user.role === UserRoles.MODERATOR && role === UserRoles.USER) {
      try {
        await this.postsQueueService.reassignDemotedModeratorPosts(id, changedById);
      } catch (error) {
        this.logger.error('Failed to enqueue demoted moderator reassignment job', {
          demotedModeratorId: id,
          changedById,
          error: error as Error,
        });
      }
    }

    return { message: 'User roles updated successfully' };
  }

  async deleteMany(ids: string[]): Promise<ResponseMessage> {
    const result = await this.usersRepo.deleteMany(ids);
    if (result === 0) {
      throw new AppUserNotFoundException();
    }

    this.logger.info(`Deleted ${result}`);
    return { message: `Deleted ${result}` };
  }

  async findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>> {
    const cleanQuery = this.normalizeAdminQuery(query);
    const activeFilters = Object.keys(query).filter((key) => query[key as keyof AdminUsersQueryDto] != null);

    this.logger.debug('Fetching users for admin', {
      page: cleanQuery.page,
      limit: cleanQuery.limit,
      activeFilters,
    });

    const result = await this.usersRepo.findAllForAdmin(cleanQuery);
    return { ...result, data: usersAdminMapper(result.data) };
  }

  async getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]> {
    const user = await this.usersRepo.findById(userId);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    return this.userRolePeriodService.getUserRoleHistory(userId);
  }

  async getDashboardSummary(): Promise<AdminDashboardOutput> {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      usersByRole,
      totalPosts,
      postsByStatus,
      moderators,
      roleHistoryEntriesCount,
      latestRoleHistoryEntry,
    ] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.user.count({ where: { isActive: true } }),
      this.prismaService.user.count({ where: { isEmailVerified: true } }),
      this.prismaService.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prismaService.post.count(),
      this.prismaService.post.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prismaService.user.findMany({
        where: { role: UserRoles.MODERATOR },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          postReviews: {
            where: {
              isActive: true,
              post: {
                status: {
                  in: [PostStatus.PENDING_REVIEW, PostStatus.BLOCKED],
                },
              },
            },
            select: {
              post: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.userRolePeriod.count(),
      this.prismaService.userRolePeriod.findFirst({
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          startDate: true,
        },
      }),
    ]);

    const roleCounts: Record<UserRoles, number> = {
      [UserRoles.USER]: 0,
      [UserRoles.ADMIN]: 0,
      [UserRoles.MODERATOR]: 0,
    };

    for (const row of usersByRole) {
      roleCounts[row.role] = row._count._all;
    }

    const statusCounts = new Map<PostStatus, number>();
    for (const row of postsByStatus) {
      statusCounts.set(row.status, row._count._all);
    }

    const moderatorLoad = moderators.map((moderator) => {
      let pendingReviewCount = 0;
      let blockedCount = 0;

      for (const review of moderator.postReviews) {
        if (review.post.status === PostStatus.PENDING_REVIEW) {
          pendingReviewCount += 1;
          continue;
        }

        if (review.post.status === PostStatus.BLOCKED) {
          blockedCount += 1;
        }
      }

      return {
        id: moderator.id,
        name: moderator.name,
        email: moderator.email,
        photoUrl: moderator.photoUrl,
        pendingReviewCount,
        blockedCount,
        totalOnReview: pendingReviewCount + blockedCount,
      };
    });

    return {
      usersInfo: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        byRole: roleCounts,
      },
      postsInfo: {
        totalPosts,
        byStatus: Object.values(PostStatus).map((status) => ({
          status,
          count: statusCounts.get(status) ?? 0,
        })),
        moderators: moderatorLoad,
      },
      userRolesInfo: {
        totalEntries: roleHistoryEntriesCount,
        latestChangedAt: latestRoleHistoryEntry?.startDate ?? null,
      },
    };
  }

  async getAllRoleHistory(search?: string): Promise<AdminRoleHistoryEntryOutput[]> {
    const entries = await this.prismaService.userRolePeriod.findMany({
      where:
        search && search.trim().length > 0
          ? {
              OR: [
                {
                  name: {
                    contains: search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  user: {
                    email: {
                      contains: search.trim(),
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            }
          : undefined,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (entries.length === 0) {
      return [];
    }

    const changedByIds = [...new Set(entries.map((entry) => entry.changedById))];
    const changedByUsers = await this.prismaService.user.findMany({
      where: {
        id: {
          in: changedByIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const changedByMap = new Map(changedByUsers.map((user) => [user.id, user.name]));

    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      userName: entry.name,
      userEmail: entry.user?.email ?? null,
      role: entry.role,
      startDate: entry.startDate,
      endDate: entry.endDate,
      changedById: entry.changedById,
      changedByName: changedByMap.get(entry.changedById) ?? null,
      createdAt: entry.createdAt,
    }));
  }

  async fetchAllModerators(): Promise<ModeratorsListOutput[]> {
    const moderators = await this.usersRepo.fetchAllModerators();
    if (moderators.length === 0) {
      this.logger.warn('No moderators found in the system');
      return [];
    }

    return moderators;
  }

  async retryFailedCommentsModeration(
    params: RetryFailedCommentsInput,
    adminId: string,
  ): Promise<{ message: string; queuedCount: number }> {
    const result = await this.commentsService.retryFailedModerationByAdmin(params, adminId);

    return {
      message: `Queued ${result.queuedCount} comment(s) for moderation retry`,
      queuedCount: result.queuedCount,
    };
  }

  private normalizeAdminQuery(query: AdminUsersQueryDto): AdminUsersQueryDto {
    const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'email', 'name'];
    const limit = Math.min(Math.max(query.limit || 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page || 1, 1);
    const sortBy = VALID_SORT_FIELDS.includes(query.sortBy || '') ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    return {
      page,
      limit,
      search: query.search,
      email: query.email,
      name: query.name,
      isActive: query.isActive,
      isEmailVerified: query.isEmailVerified,
      role: query.role,
      sortBy,
      sortOrder,
    };
  }
}
