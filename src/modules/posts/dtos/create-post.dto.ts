import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, MinLength, MaxLength, IsNumber, Min, MinDate, IsBoolean, IsOptional } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'My First Post', description: 'The title of the post' })
  @IsString({ message: 'Title must be a string' })
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  @MaxLength(100, { message: 'Title must be at most 100 characters long' })
  title: string;

  @ApiProperty({
    example: 'This is the content of my first post, describing the details and purpose.',
    description: 'The content of the post',
  })
  @IsString({ message: 'Content must be a string' })
  @MinLength(50, { message: 'Content must be at least 50 characters long' })
  @MaxLength(2000, { message: 'Content must be at most 2000 characters long' })
  content: string;

  @ApiProperty({ example: 1000, description: 'The target amount for the post' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Target amount must be a valid number' })
  @Min(0, { message: 'Target amount must be at least 0' })
  targetAmount: number;

  @ApiProperty({ example: '2025-10-12', description: 'The target date for the post in YYYY-MM-DD format' })
  @MinDate(new Date(), { message: 'Target date must be in the future' })
  @Type(() => Date)
  targetDate: Date;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Whether to keep post as draft on create. If false, post is sent to pending review.',
  })
  @IsOptional()
  @IsBoolean({ message: 'isDraft must be a boolean value' })
  isDraft?: boolean;
}
