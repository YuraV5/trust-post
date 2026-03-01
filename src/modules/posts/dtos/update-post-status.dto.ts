import { ApiProperty } from '@nestjs/swagger';
import { PostStatus, VersionStatus } from '@prisma/client';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class PostStatusLifecycleDto {
  @ApiProperty({
    description: 'The new status of the post',
    enum: PostStatus,
    example: PostStatus.COMPLETED,
  })
  @IsNotEmpty()
  postStatus: PostStatus;

  @ApiProperty({
    description: 'The reason for the status change, if applicable',
    example: 'Reached funding goal',
  })
  @IsOptional()
  @MinLength(20)
  statusReason?: string;

  @ApiProperty({
    description: 'The new review status of the post',
    enum: VersionStatus,
    example: VersionStatus.APPROVED,
  })
  @IsNotEmpty()
  reviewStatus: VersionStatus;

  @ApiProperty({
    description: 'The reason for the review status change, if applicable',
    example: 'Reviewed and approved',
  })
  @IsOptional()
  @MinLength(20)
  reviewReason?: string;
}
