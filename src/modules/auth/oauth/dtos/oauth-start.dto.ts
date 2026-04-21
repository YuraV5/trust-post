import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class OAuthStartDto {
  @ApiPropertyOptional({ example: '/oauth/callback' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirectTo?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
