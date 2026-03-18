import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger response schemas for the Files module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class UploadedFileDto {
  @ApiProperty({
    example: 'https://cdn.example.com/file-123.jpg',
    description: 'URL to access the uploaded file',
  })
  url: string;

  @ApiProperty({
    example: 'file-123.jpg',
    description: 'Public file name/key',
  })
  key: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type of the file',
  })
  mimeType: string;

  @ApiProperty({
    example: 1024000,
    description: 'File size in bytes',
  })
  size: number;

  @ApiProperty({
    example: '2026-01-15T10:30:00Z',
    description: 'Upload timestamp',
  })
  uploadedAt: Date;
}

export class FileUploadResponseDto {
  @ApiProperty({
    type: [UploadedFileDto],
    description: 'Array of uploaded files',
  })
  files: UploadedFileDto[];

  @ApiProperty({
    example: 3,
    description: 'Number of successfully uploaded files',
  })
  uploadedCount: number;

  @ApiProperty({
    example: 0,
    description: 'Number of failed uploads',
  })
  failedCount: number;
}
