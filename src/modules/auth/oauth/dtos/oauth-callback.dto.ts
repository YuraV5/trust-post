import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @ApiPropertyOptional({ example: '4/0AQSTgQF4...' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'access_denied' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsOptional()
  @IsString()
  state?: string;

  // Extra query params some providers append — whitelist to avoid validation failures
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
