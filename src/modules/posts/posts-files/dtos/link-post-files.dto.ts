import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import { FileProvider } from '@prisma/client';

export class FileMetadataDto {
  @ApiProperty({ description: 'Image width in pixels', required: false })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Image height in pixels', required: false })
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'File format' })
  @IsString()
  format: string;
}

export class LinkFileRecordDto {
  @ApiProperty({ description: 'File URL from storage' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Storage provider key' })
  @IsString()
  storageKey: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  size: number;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  originalName: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Storage provider (CLOUDINARY, etc.)' })
  provider: FileProvider;

  @ApiProperty({ description: 'File metadata (dimensions, format)' })
  @IsObject()
  @ValidateNested()
  @Type(() => FileMetadataDto)
  metadata: FileMetadataDto;

  @ApiProperty({ description: 'Mark as main image', required: false })
  @IsOptional()
  @IsBoolean()
  mainImage?: boolean;
}

export class LinkPostFilesDto {
  @ApiProperty({ description: 'Files to link to post', type: [LinkFileRecordDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LinkFileRecordDto)
  files: LinkFileRecordDto[];
}
