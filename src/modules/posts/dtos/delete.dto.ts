import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsInt, Min, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteManyPostsDto {
  @ApiProperty({
    description: 'Array of post IDs to delete',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  postIds: number[];
}

export class DeletePostByUserDto {
  @ApiProperty({
    description: 'Reason for deleting the post',
    type: String,
    example: 'Inappropriate content',
  })
  @IsString()
  @MinLength(5)
  statusReason: string;
}
