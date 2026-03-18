import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updated comment content',
    description: 'The updated content of the comment',
  })
  @IsString({ message: 'Content must be a string' })
  @MinLength(3, { message: 'Content must be at least 3 characters long' })
  @MaxLength(1000, { message: 'Content must be at most 1000 characters long' })
  content: string;
}
