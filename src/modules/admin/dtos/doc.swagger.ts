import { ApiProperty } from '@nestjs/swagger';
import { PostStatus, UserRoles } from '@prisma/client';

/**
 * Swagger response schemas for the Admin module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class AdminUserDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User display name',
  })
  name: string;

  @ApiProperty({
    example: 'https://example.com/photo.jpg',
    nullable: true,
    description: 'Profile photo URL',
  })
  photoUrl: string | null;

  @ApiProperty({
    example: true,
    description: 'Is email verified',
  })
  isEmailVerified: boolean;

  @ApiProperty({
    example: true,
    description: 'Is account active',
  })
  isActive: boolean;

  @ApiProperty({
    type: [String],
    enum: Object.values(UserRoles),
    example: ['USER', 'MODERATOR'],
    description: 'User roles',
  })
  roles: UserRoles[];

  @ApiProperty({
    example: '2026-01-01T00:00:00Z',
    description: 'Account creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-15T10:30:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

export class RoleChangeHistoryDto {
  @ApiProperty({
    example: 1,
    description: 'History record ID',
  })
  id: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID',
  })
  userId: string;

  @ApiProperty({
    example: 'MODERATOR',
    enum: Object.values(UserRoles),
    description: 'Assigned role',
  })
  role: UserRoles;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Admin ID who made the change',
  })
  assignedBy: string;

  @ApiProperty({
    example: '2026-01-15T10:30:00Z',
    description: 'When role was assigned',
  })
  assignedAt: Date;

  @ApiProperty({
    example: '2026-02-15T10:30:00Z',
    nullable: true,
    description: 'When role was revoked (null if still active)',
  })
  revokedAt: Date | null;
}

export class PaginatedAdminUsersResponseDto {
  @ApiProperty({
    type: [AdminUserDto],
    description: 'Array of users',
  })
  data: AdminUserDto[];

  @ApiProperty({
    example: 250,
    description: 'Total number of users',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Items per page',
  })
  limit: number;
}

export class AdminDashboardRoleCountsDto {
  @ApiProperty({ example: 120 })
  USER: number;

  @ApiProperty({ example: 4 })
  ADMIN: number;

  @ApiProperty({ example: 8 })
  MODERATOR: number;
}

export class AdminDashboardUsersInfoDto {
  @ApiProperty({ example: 132 })
  totalUsers: number;

  @ApiProperty({ example: 121 })
  activeUsers: number;

  @ApiProperty({ example: 117 })
  verifiedUsers: number;

  @ApiProperty({ type: AdminDashboardRoleCountsDto })
  byRole: AdminDashboardRoleCountsDto;
}

export class AdminDashboardPostStatusInfoDto {
  @ApiProperty({ enum: PostStatus, example: PostStatus.PENDING_REVIEW })
  status: PostStatus;

  @ApiProperty({ example: 42 })
  count: number;
}

export class AdminDashboardModeratorLoadDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Moderator Jane' })
  name: string;

  @ApiProperty({ example: 'moderator@example.com' })
  email: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  photoUrl: string | null;

  @ApiProperty({ example: 6 })
  pendingReviewCount: number;

  @ApiProperty({ example: 2 })
  blockedCount: number;

  @ApiProperty({ example: 8 })
  totalOnReview: number;
}

export class AdminDashboardPostsInfoDto {
  @ApiProperty({ example: 214 })
  totalPosts: number;

  @ApiProperty({ type: [AdminDashboardPostStatusInfoDto] })
  byStatus: AdminDashboardPostStatusInfoDto[];

  @ApiProperty({ type: [AdminDashboardModeratorLoadDto] })
  moderators: AdminDashboardModeratorLoadDto[];
}

export class AdminDashboardRoleHistoryInfoDto {
  @ApiProperty({ example: 37 })
  totalEntries: number;

  @ApiProperty({ example: '2026-06-01T08:30:00.000Z', nullable: true })
  latestChangedAt: Date | null;
}

export class AdminDashboardResponseDto {
  @ApiProperty({ type: AdminDashboardUsersInfoDto })
  usersInfo: AdminDashboardUsersInfoDto;

  @ApiProperty({ type: AdminDashboardPostsInfoDto })
  postsInfo: AdminDashboardPostsInfoDto;

  @ApiProperty({ type: AdminDashboardRoleHistoryInfoDto })
  userRolesInfo: AdminDashboardRoleHistoryInfoDto;
}

export class AdminRoleHistoryEntryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: 'john_doe' })
  userName: string;

  @ApiProperty({ enum: UserRoles, example: UserRoles.MODERATOR })
  role: UserRoles;

  @ApiProperty({ example: '2026-06-01T08:30:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-06-05T08:30:00.000Z', nullable: true })
  endDate: Date | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  changedById: string;

  @ApiProperty({ example: 'Admin Jane', nullable: true })
  changedByName: string | null;

  @ApiProperty({ example: '2026-06-01T08:30:00.000Z' })
  createdAt: Date;
}
