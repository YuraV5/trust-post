import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { FileProvider } from '@prisma/client';

export class AddFileDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg' })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiProperty({ example: 'folder/sample_abc123' })
  @IsNotEmpty()
  @IsString()
  storageKey: string;

  @ApiProperty({ enum: FileProvider, example: FileProvider.CLOUDINARY })
  @IsEnum(FileProvider)
  provider: FileProvider;

  @ApiProperty({ example: 'image/jpeg' })
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 1024000 })
  @IsNumber()
  size: number;

  @ApiProperty({ example: 'vacation-photo.jpg' })
  @IsNotEmpty()
  @IsString()
  originalName: string;
}
