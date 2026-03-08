import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello everyone!' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
