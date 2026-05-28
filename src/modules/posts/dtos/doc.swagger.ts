import { ApiProperty } from '@nestjs/swagger';
import { CommentStatus, Currencies, ModeratorType, PostReviewStatus, PostStatus } from '@prisma/client';

/**
 * Swagger response schemas for the Posts module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class PostAuthorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Author name' })
  name: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, description: 'Author photo URL' })
  photoUrl: string | null;

  @ApiProperty({ example: true, description: 'Whether author email is verified' })
  isEmailVerified: boolean;
}

export class PostBaseResponseDto {
  @ApiProperty({ example: 1, description: 'Post ID' })
  id: number;

  @ApiProperty({ example: 'Amazing Story Title', description: 'Post title' })
  title: string;

  @ApiProperty({ example: 'This is the content of the post...', description: 'Post content' })
  content: string;

  @ApiProperty({ example: 1000.5, description: 'Target amount to collect' })
  targetAmount: number;

  @ApiProperty({ example: 320.25, description: 'Current collected amount' })
  currentAmount: number;

  @ApiProperty({ enum: Currencies, example: Currencies.UAH, description: 'Currency code' })
  currency: Currencies;

  @ApiProperty({ example: 'ref_9f4a8d9f-1111-4f44-a6a0-a2f7f4f8fabc', description: 'Internal payment reference' })
  referencePaymentId: string;

  @ApiProperty({ example: '2026-05-30T00:00:00.000Z', description: 'Target date of campaign' })
  targetDate: Date;

  @ApiProperty({
    enum: PostStatus,
    example: PostStatus.APPROVED,
    description: 'Post status (DRAFT, PENDING_REVIEW, APPROVED, REJECTED, BLOCKED, ARCHIVED, COMPLETED)',
  })
  status: PostStatus;

  @ApiProperty({ nullable: true, example: 'Contains prohibited content', description: 'Reason for status change' })
  statusReason: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Post author ID' })
  authorId: string;

  @ApiProperty({ example: 25, description: 'Number of approved comments' })
  totalComments: number;

  @ApiProperty({ example: 150, description: 'Number of likes' })
  totalLikes: number;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Post creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-16T14:22:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ example: null, nullable: true, description: 'Soft delete timestamp' })
  deletedAt: Date | null;
}

export class PostResponseDto extends PostBaseResponseDto {
  @ApiProperty({ type: PostAuthorDto, nullable: true, description: 'Author summary (present on GET /posts/:id)' })
  author: PostAuthorDto | null;
}

export class PublicPostListItemDto extends PostBaseResponseDto {
  @ApiProperty({ example: 'https://cdn.example.com/post-main.jpg', nullable: true, description: 'Main image URL' })
  mainImageUrl: string | null;
}

export class CommentAuthorDto {
  @ApiProperty({ example: 'Jane Smith', description: 'Commenter name' })
  name: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: 1, description: 'Comment ID' })
  id: number;

  @ApiProperty({ example: 'Great post!', description: 'Comment text' })
  content: string;

  @ApiProperty({ example: 1, description: 'Post ID' })
  postId: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Comment author ID' })
  authorId: string;

  @ApiProperty({ enum: CommentStatus, example: CommentStatus.APPROVED, description: 'Moderation status' })
  status: CommentStatus;

  @ApiProperty({ example: 12, description: 'Number of likes' })
  totalLikes: number;

  @ApiProperty({ example: 'gemini', nullable: true, description: 'Moderation provider' })
  moderationProvider: string | null;

  @ApiProperty({ example: 0.92, nullable: true, description: 'Moderation confidence score' })
  moderationScore: number | null;

  @ApiProperty({ example: null, nullable: true, description: 'Moderation reason if rejected/failed' })
  moderationReason: string | null;

  @ApiProperty({ example: null, nullable: true, description: 'Moderation date' })
  moderatedAt: Date | null;

  @ApiProperty({ enum: ModeratorType, nullable: true, example: ModeratorType.AGENT, description: 'Moderator type' })
  moderatorType: ModeratorType | null;

  @ApiProperty({ type: CommentAuthorDto, description: 'Comment author' })
  author: CommentAuthorDto;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T11:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;
}

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: [PublicPostListItemDto], description: 'Array of posts' })
  data: PublicPostListItemDto[];

  @ApiProperty({ example: 42, description: 'Total number of posts' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedCommentsResponseDto {
  @ApiProperty({ type: [CommentResponseDto], description: 'Array of comments' })
  data: CommentResponseDto[];

  @ApiProperty({ example: 25, description: 'Total number of comments' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number;
}

export class StaffModeratorSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'Moderator Name', description: 'Display name' })
  name: string;

  @ApiProperty({ example: 'moderator@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'https://cdn.example.com/moderator.jpg', nullable: true, description: 'Photo URL' })
  photoUrl: string | null;
}

export class StaffPostReviewSummaryDto {
  @ApiProperty({ example: 501, description: 'Review row ID' })
  id: number;

  @ApiProperty({ example: 123, description: 'Post ID' })
  postId: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Reviewer ID' })
  reviewedById: string;

  @ApiProperty({ enum: PostReviewStatus, example: PostReviewStatus.PENDING, description: 'Review status' })
  status: PostReviewStatus;

  @ApiProperty({ example: true, description: 'Active review marker' })
  isActive: boolean;

  @ApiProperty({ example: null, nullable: true, description: 'Review reason' })
  reviewReason: string | null;

  @ApiProperty({ example: '2026-02-03T12:40:00.000Z', description: 'Review creation date' })
  createdAt: Date;

  @ApiProperty({ type: StaffModeratorSummaryDto, nullable: true, description: 'Reviewer summary' })
  reviewedBy: StaffModeratorSummaryDto | null;
}

export class StaffModerationPostResponseDto extends PostBaseResponseDto {
  @ApiProperty({ type: StaffModeratorSummaryDto, nullable: true, description: 'Post author summary' })
  author: StaffModeratorSummaryDto | null;

  @ApiProperty({ type: [StaffPostReviewSummaryDto], description: 'Latest active review entries' })
  postReviews: StaffPostReviewSummaryDto[];
}

export class PaginatedStaffPostsResponseDto {
  @ApiProperty({ type: [StaffModerationPostResponseDto], description: 'Array of moderation posts' })
  data: StaffModerationPostResponseDto[];

  @ApiProperty({ example: 42, description: 'Total number of posts' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}

export class ModerationHistoryAuthorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'Jane Smith', description: 'User name' })
  name: string;

  @ApiProperty({ example: 'jane@example.com', description: 'User email' })
  email: string;
}

export class ModerationHistoryPostDto {
  @ApiProperty({ example: 123, description: 'Post ID' })
  id: number;

  @ApiProperty({ example: 'Help for shelter repairs', description: 'Post title' })
  title: string;

  @ApiProperty({ example: '2026-02-02T09:20:00.000Z', description: 'Post creation date' })
  createdAt: Date;

  @ApiProperty({ type: ModerationHistoryAuthorDto, nullable: true, description: 'Post author summary' })
  author: ModerationHistoryAuthorDto | null;
}

export class ModerationHistoryModeratorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Moderator ID' })
  id: string;

  @ApiProperty({ example: 'Moderator Name', description: 'Moderator display name' })
  name: string;

  @ApiProperty({ example: 'moderator@example.com', description: 'Moderator email' })
  email: string;
}

export class ModerationHistoryEventDto {
  @ApiProperty({ example: 501, description: 'Post review row ID' })
  reviewId: number;

  @ApiProperty({
    enum: PostReviewStatus,
    example: PostReviewStatus.REJECTED,
    description: 'Review status at this step',
  })
  reviewStatus: PostReviewStatus;

  @ApiProperty({ enum: PostStatus, example: PostStatus.BLOCKED, description: 'Resulting post status at this step' })
  postStatus: PostStatus;

  @ApiProperty({ nullable: true, example: 'Contains prohibited content', description: 'Moderation reason if present' })
  reason: string | null;

  @ApiProperty({ example: '2026-02-03T12:40:00.000Z', description: 'Date of this status transition' })
  changedAt: Date;

  @ApiProperty({ type: ModerationHistoryModeratorDto, nullable: true, description: 'Moderator who made this decision' })
  moderator: ModerationHistoryModeratorDto | null;
}

export class PostModerationHistoryResponseDto {
  @ApiProperty({ type: ModerationHistoryPostDto, description: 'Post summary' })
  post: ModerationHistoryPostDto;

  @ApiProperty({ type: [ModerationHistoryEventDto], description: 'Moderation timeline (newest first)' })
  history: ModerationHistoryEventDto[];
}
