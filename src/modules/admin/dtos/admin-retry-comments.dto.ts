import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AdminRetryCommentsDto {
  @ApiPropertyOptional({ description: 'Filter by post ID', example: 123 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId?: number;

  @ApiPropertyOptional({ description: 'Filter by comment author ID', example: '4d95bd8f-91d8-4f52-ac88-244f39f9482c' })
  @IsOptional()
  @IsString()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Max number of failed comments to retry in one request',
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class AdminRetryCommentsResponseDto {
  @ApiPropertyOptional({ example: 'Queued 25 comment(s) for moderation retry' })
  message: string;

  @ApiPropertyOptional({ example: 25 })
  queuedCount: number;
}
