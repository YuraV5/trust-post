import { PostStatus, UserRoles } from '@prisma/client';

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
