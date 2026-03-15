import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class OAuthStartDto {
  @ApiProperty({ example: 'e3d2b978-f8f5-4a3e-95f9-f6ab9df39d16' })
  @IsUUID()
  deviceId: string;

  @ApiPropertyOptional({ example: '/oauth/callback' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirectTo?: string;
}
