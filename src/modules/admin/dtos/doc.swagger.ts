import { ApiProperty } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';

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
