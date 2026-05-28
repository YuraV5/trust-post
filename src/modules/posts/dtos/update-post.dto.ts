import { ApiProperty } from '@nestjs/swagger';
import { PostReviewStatus, PostStatus } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

const POST_STATUS_VALUES = ['ARCHIVED', 'COMPLETED'] as const;
export type PostCondition = (typeof POST_STATUS_VALUES)[number];

export class UpdatePostDto {
  @ApiProperty({
    description: 'The title of the post',
    example: 'New Post Title',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    description: 'The content of the post',
    example: 'This is the updated content of the post.',
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  content?: string;
}

export class ModifyUserPostStatusDto {
  @ApiProperty({
    description: 'The status of the post',
    example: 'ARCHIVED',
    enum: POST_STATUS_VALUES,
  })
  @IsString()
  @IsIn(POST_STATUS_VALUES, { message: `status must be one of: ${POST_STATUS_VALUES.join(', ')}` })
  status: PostCondition;

  @ApiProperty({
    description: 'The reason for the status change, required for some statuses',
    example: 'The post was archived due to inactivity.',
  })
  @IsString()
  @MinLength(5, { message: 'statusReason must be at least 5 characters long' })
  statusReason: string;
}

export class PostStatusLifecycleDto {
  @ApiProperty({
    description: 'The new status of the post',
    enum: PostStatus,
    example: PostStatus.COMPLETED,
  })
  @IsNotEmpty()
  @IsEnum(PostStatus)
  postStatus: PostStatus;

  @ApiProperty({
    description: 'The reason for the status change, if applicable',
    example: 'Reached funding goal',
  })
  @ValidateIf(
    (o: PostStatusLifecycleDto) => o.postStatus === PostStatus.REJECTED || o.postStatus === PostStatus.BLOCKED,
  )
  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  statusReason?: string;

  @ApiProperty({
    description: 'The new review status of the post',
    enum: PostReviewStatus,
    example: PostReviewStatus.APPROVED,
  })
  @IsNotEmpty()
  @IsEnum(PostReviewStatus)
  reviewStatus: PostReviewStatus;

  @ApiProperty({
    description: 'The reason for the review status change, if applicable',
    example: 'Reviewed and approved',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  reviewReason?: string;
}
