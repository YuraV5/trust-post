import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'http://example.com/photo.jpg', required: false })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}
