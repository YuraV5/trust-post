import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EditMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsNotEmpty()
  @IsString()
  newContent: string;
}
