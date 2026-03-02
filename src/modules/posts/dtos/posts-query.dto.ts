import { IsInt, IsOptional, Min, IsString, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';

// Sort field constants
export const POST_SORT_FIELDS = ['createdAt', 'targetDate', 'targetAmount', 'currentAmount'] as const;
export type PostSortField = (typeof POST_SORT_FIELDS)[number];

// Sort order constants
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class PostsQueryDto {
  @ApiProperty({ example: 1, description: 'Page number for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Number of items per page for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ example: '2023-01-01', description: 'Filter posts by creation date' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiProperty({ example: '2023-12-31', description: 'Filter posts by target date' })
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiProperty({ example: 1000, description: 'Filter posts by target amount' })
  @IsOptional()
  @Type(() => Number)
  targetAmount?: number;

  @ApiProperty({ example: 500, description: 'Filter posts by current amount' })
  @IsOptional()
  @Type(() => Number)
  currentAmount?: number;

  @ApiProperty({ example: 'createdAt', description: 'Field to sort by' })
  @IsOptional()
  @IsIn(POST_SORT_FIELDS)
  sortBy?: PostSortField = 'createdAt';

  @ApiProperty({ example: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc';
}

export class PostsStaffQueryDto extends PostsQueryDto {
  @ApiProperty({ example: 'userId123', description: 'Filter posts by author ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiProperty({ example: 'PENDING', description: 'Filter posts by status' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}

export class UserPostsQueryDto {
  @ApiProperty({ example: 1, description: 'Page number for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Number of items per page for pagination' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ example: 'PENDING', description: 'Filter posts by status' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiProperty({ example: 'createdAt', description: 'Field to sort by' })
  @IsOptional()
  @IsIn(POST_SORT_FIELDS)
  sortBy?: PostSortField = 'createdAt';

  @ApiProperty({ example: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc';
}
