import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger response schemas for Chat & Messages modules.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class ChatMemberDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Member name' })
  name: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, description: 'Member photo URL' })
  photoUrl: string | null;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'When member joined chat' })
  joinedAt: Date;
}

export class ChatResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Chat ID (UUID)' })
  id: string;

  @ApiProperty({ example: 'Project Discussion', nullable: true, description: 'Chat name' })
  name: string | null;

  @ApiProperty({ example: 'Discussion about the new project', nullable: true, description: 'Chat description' })
  description: string | null;

  @ApiProperty({ example: false, description: 'Is direct message (1-on-1 chat)' })
  isDirectMessage: boolean;

  @ApiProperty({ example: 5, description: 'Number of members' })
  membersCount: number;

  @ApiProperty({ type: [ChatMemberDto], description: 'List of chat members' })
  members: ChatMemberDto[];

  @ApiProperty({ example: 1, nullable: true, description: 'Associated post ID' })
  postId: number | null;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Chat creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-16T14:22:00Z', description: 'Last message timestamp' })
  lastMessageAt: Date;
}

export class MessageFileDto {
  @ApiProperty({ example: 1, description: 'File ID' })
  id: number;

  @ApiProperty({ example: 'https://cdn.example.com/msg-file-123.pdf', description: 'File URL' })
  url: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ example: 'document.pdf', description: 'File name' })
  filename: string;

  @ApiProperty({ example: 512000, description: 'File size in bytes' })
  size: number;
}

export class MessageAuthorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Author name' })
  name: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, description: 'Author photo URL' })
  photoUrl: string | null;
}

export class MessageResponseDto {
  @ApiProperty({ example: 1, description: 'Message ID' })
  id: number;

  @ApiProperty({ example: 'Hello, how are you?', nullable: true, description: 'Message content' })
  content: string | null;

  @ApiProperty({ example: 'mixed', enum: ['text', 'file', 'mixed', 'system'], description: 'Message type' })
  type: string;

  @ApiProperty({ example: 'sent', enum: ['sending', 'sent', 'failed'], description: 'Delivery status' })
  status: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Chat ID' })
  chatId: string;

  @ApiProperty({ type: MessageAuthorDto, description: 'Message sender' })
  author: MessageAuthorDto;

  @ApiProperty({
    type: [MessageFileDto],
    description: 'Attached files',
  })
  attachments: MessageFileDto[];

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Message creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T11:00:00Z', nullable: true, description: 'Last edit timestamp' })
  editedAt: Date | null;

  @ApiProperty({ example: null, nullable: true, description: 'Soft delete timestamp' })
  deletedAt: Date | null;
}

export class PaginatedMessagesResponseDto {
  @ApiProperty({ type: [MessageResponseDto], description: 'Array of messages' })
  data: MessageResponseDto[];

  @ApiProperty({ example: 100, description: 'Total number of messages' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;
}

export class PaginatedChatsResponseDto {
  @ApiProperty({ type: [ChatResponseDto], description: 'Array of chats' })
  data: ChatResponseDto[];

  @ApiProperty({ example: 15, description: 'Total number of chats' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;
}
