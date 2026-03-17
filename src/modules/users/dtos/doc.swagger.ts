import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger response schemas for the Users module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class UserProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Unique user identifier (UUID)' })
  id: string;

  @ApiProperty({ example: 'johndoe', description: 'Display name of the user' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({
    example: 'https://example.com/photo.jpg',
    nullable: true,
    description: 'URL of the user profile photo',
  })
  photoUrl: string | null;

  @ApiProperty({ example: true, description: 'Whether the user email has been verified' })
  isEmailVerified: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'Account creation timestamp' })
  createdAt: Date;
}
