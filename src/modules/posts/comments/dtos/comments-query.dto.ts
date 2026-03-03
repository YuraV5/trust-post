import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, IsIn } from 'class-validator';

export class CommentsQueryDto {
  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Number of items per page', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @ApiProperty({
    example: 'createdAt',
    description: 'Field to sort by',
    required: false,
    enum: ['createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'], { message: 'SortBy must be one of: createdAt, updatedAt' })
  sortBy?: 'createdAt' | 'updatedAt' = 'createdAt';

  @ApiProperty({
    example: 'desc',
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'SortOrder must be either asc or desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
