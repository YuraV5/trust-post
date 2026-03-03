import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class LikeCommentDto {
  @ApiProperty({
    example: 1,
    description: 'The ID of the comment to like',
  })
  @IsNumber({}, { message: 'Comment ID must be a number' })
  @Min(1, { message: 'Comment ID must be at least 1' })
  commentId: number;
}
