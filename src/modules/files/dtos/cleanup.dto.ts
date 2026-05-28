import { ApiProperty } from '@nestjs/swagger';
import { FileUploadTarget } from '../types';
import { ArrayNotEmpty, IsArray, IsEnum, IsString } from 'class-validator';

export class CleanupUploadedFilesDto {
  @ApiProperty({ enum: FileUploadTarget, description: 'Upload target scope for cleanup' })
  @IsEnum(FileUploadTarget)
  target: FileUploadTarget;

  @ApiProperty({ type: [String], description: 'Storage keys (Cloudinary public IDs) to delete' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  storageKeys: string[];
}
