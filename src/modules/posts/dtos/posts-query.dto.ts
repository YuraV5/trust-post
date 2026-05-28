import { IsInt, IsOptional, Min, IsString, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Sort field constants
export const POST_SORT_FIELDS = ['createdAt', 'targetDate', 'targetAmount', 'currentAmount'] as const;
export type PostSortField = (typeof POST_SORT_FIELDS)[number];

// Sort order constants
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class PostsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Number of items per page for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ example: '2023-01-01', description: 'Filter posts by creation date' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional({ example: '2023-12-31', description: 'Filter posts by target date' })
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Filter posts by target amount' })
  @IsOptional()
  @Type(() => Number)
  targetAmount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Filter posts by current amount' })
  @IsOptional()
  @Type(() => Number)
  currentAmount?: number;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort by' })
  @IsOptional()
  @IsIn(POST_SORT_FIELDS)
  sortBy?: PostSortField = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc';

  @ApiPropertyOptional({ example: 'please help', description: 'Full-text search across title and content' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PostsStaffQueryDto extends PostsQueryDto {
  @ApiPropertyOptional({ example: 'userId123', description: 'Filter posts by author ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ example: 'PENDING_REVIEW', description: 'Filter posts by status' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}

export class UserPostsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Number of items per page for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'PENDING_REVIEW', description: 'Filter posts by status' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort by' })
  @IsOptional()
  @IsIn(POST_SORT_FIELDS)
  sortBy?: PostSortField = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc';
}
