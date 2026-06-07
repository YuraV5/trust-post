import { Injectable } from '@nestjs/common';
import { PostStatus, UserRoles } from '@prisma/client';
import { AdminDashboardOutput, AdminRoleHistoryEntryOutput } from '../types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardRepo {
  constructor(private readonly db: PrismaService) {}

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
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { isEmailVerified: true } }),
      this.db.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.db.post.count(),
      this.db.post.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.db.user.findMany({
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
      this.db.userRolePeriod.count(),
      this.db.userRolePeriod.findFirst({
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
    const entries = await this.db.userRolePeriod.findMany({
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
    const changedByUsers = await this.db.user.findMany({
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
}
