import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsString, IsEnum } from 'class-validator';
import { FileProvider } from '@prisma/client';

export class DeleteFilesDto {
  @ApiProperty({ description: 'Storage keys to delete', type: [String], example: ['users/123/posts/1/file-key'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  keys: string[];

  @ApiProperty({ description: 'Storage type where files are stored' })
  @IsEnum(FileProvider)
  storage: FileProvider;
}
