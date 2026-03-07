import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { FileFolder, StorageType } from '../types';

export class UploadDocumentsDto {
  @ApiProperty({ description: 'ID of the resource the file is associated with' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  resourceId: number;

  @ApiProperty({ description: 'Folder/category for the file (e.g., profile-pictures, post-images)' })
  @IsEnum(FileFolder)
  fileFolder: FileFolder;

  @ApiProperty({ description: 'Storage type to use for the file' })
  @IsEnum(StorageType)
  storage: StorageType;
}
