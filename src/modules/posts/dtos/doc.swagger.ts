import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

/**
 * Swagger response schemas for the Posts module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class PostAuthorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Author name' })
  name: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, description: 'Author photo URL' })
  photoUrl: string | null;
}

export class PostFileDto {
  @ApiProperty({ example: 1, description: 'File ID' })
  id: number;

  @ApiProperty({ example: 'https://cdn.example.com/file-123.jpg', description: 'File URL' })
  url: string;

  @ApiProperty({ example: 'image/jpeg', description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ example: 'image-123.jpg', description: 'File name' })
  filename: string;

  @ApiProperty({ example: 1024000, description: 'File size in bytes' })
  size: number;

  @ApiProperty({ example: true, description: 'Is main file for post' })
  isMain: boolean;
}

export class PostResponseDto {
  @ApiProperty({ example: 1, description: 'Post ID' })
  id: number;

  @ApiProperty({ example: 'Amazing Story Title', description: 'Post title' })
  title: string;

  @ApiProperty({ example: 'This is the content of the post...', description: 'Post content' })
  content: string;

  @ApiProperty({
    enum: PostStatus,
    example: 'PUBLISHED',
    description: 'Post status (DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED)',
  })
  status: PostStatus;

  @ApiProperty({ example: 150, description: 'Number of likes' })
  likesCount: number;

  @ApiProperty({ example: 25, description: 'Number of comments' })
  commentsCount: number;

  @ApiProperty({ type: PostAuthorDto, description: 'Post author information' })
  author: PostAuthorDto;

  @ApiProperty({
    type: [PostFileDto],
    description: 'Attached files/images',
  })
  files: PostFileDto[];

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Post creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-16T14:22:00Z', description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CommentAuthorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'Jane Smith', description: 'Commenter name' })
  name: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, description: 'Photo URL' })
  photoUrl: string | null;
}

export class CommentResponseDto {
  @ApiProperty({ example: 1, description: 'Comment ID' })
  id: number;

  @ApiProperty({ example: 'Great post!', description: 'Comment text' })
  content: string;

  @ApiProperty({ example: 12, description: 'Number of likes' })
  likesCount: number;

  @ApiProperty({ example: 1, description: 'Post ID' })
  postId: number;

  @ApiProperty({ type: CommentAuthorDto, description: 'Comment author' })
  author: CommentAuthorDto;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T11:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;
}

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: [PostResponseDto], description: 'Array of posts' })
  data: PostResponseDto[];

  @ApiProperty({ example: 42, description: 'Total number of posts' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;
}

export class PaginatedCommentsResponseDto {
  @ApiProperty({ type: [CommentResponseDto], description: 'Array of comments' })
  data: CommentResponseDto[];

  @ApiProperty({ example: 25, description: 'Total number of comments' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;
}
