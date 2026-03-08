import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ChatType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
}

export class CreateChatDto {
  @ApiProperty({ enum: ChatType, example: ChatType.PRIVATE })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiPropertyOptional({ example: 'My Awesome Group Chat' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ type: [String], example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];
}
