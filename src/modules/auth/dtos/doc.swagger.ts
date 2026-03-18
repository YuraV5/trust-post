import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger response schemas for the Auth module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class AuthUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID (UUID)' })
  userId: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User display name' })
  name: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true, description: 'Profile photo URL' })
  photoUrl: string | null;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (valid for 1 hour)',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto, description: 'Authenticated user information' })
  user: AuthUserDto;
}

export class SessionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Session ID (UUID)' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', description: 'User agent' })
  userAgent: string;

  @ApiProperty({ example: '192.168.1.1', description: 'IP address' })
  ipAddress: string;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Session creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-20T10:30:00Z', description: 'Last activity timestamp' })
  lastActivityAt: Date;

  @ApiProperty({ example: '2026-02-14T10:30:00Z', description: 'Session expiration timestamp' })
  expiresAt: Date;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  accessToken: string;
}
