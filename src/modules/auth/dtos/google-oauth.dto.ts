import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GoogleOAuthStartDto {
  @ApiProperty({ example: 'e3d2b978-f8f5-4a3e-95f9-f6ab9df39d16' })
  @IsUUID()
  deviceId: string;

  @ApiPropertyOptional({ example: '/oauth/callback' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirectTo?: string;
}

export class GoogleOAuthCallbackDto {
  @ApiPropertyOptional({ example: '4/0AQSTgQF4....' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'access_denied' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  state: string;

  // Extra query params appended by Google — ignored but must be whitelisted
  @IsOptional()
  @IsString()
  iss?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  authuser?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}
