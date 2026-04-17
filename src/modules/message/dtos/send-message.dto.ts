import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello everyone!', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}
