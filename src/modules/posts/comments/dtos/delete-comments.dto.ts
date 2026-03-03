import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, Min } from 'class-validator';

export class DeleteCommentsDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of comment IDs to delete',
    type: [Number],
  })
  @IsArray({ message: 'IDs must be an array' })
  @IsNumber({}, { each: true, message: 'Each ID must be a number' })
  @Min(1, { each: true, message: 'Each ID must be at least 1' })
  ids: number[];
}
