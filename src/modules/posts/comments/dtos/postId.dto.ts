import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class PostIdParamDto {
  @ApiProperty({ example: 123, description: 'The ID of the post' })
  @IsInt({ message: 'Post ID must be an integer' })
  @Type(() => Number)
  postId: number;
}
