import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AdminDeleteDto {
  @ApiProperty({ type: [String], description: 'Array of user IDs to delete' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  ids: string[];
}
