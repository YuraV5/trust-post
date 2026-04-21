import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OAuthStartDto {
  @ApiPropertyOptional({ example: '/oauth/callback' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirectTo?: string;
}
