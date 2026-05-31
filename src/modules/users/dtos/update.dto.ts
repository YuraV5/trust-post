import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserRoles } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'http://example.com/photo.jpg', required: false, nullable: true })
  @Transform(({ value }: { value: string }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  photoUrl?: string | null;
}

export class UpdateStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateRolesDto {
  @ApiProperty({ example: ['admin', 'user'] })
  @IsEnum(UserRoles)
  role: UserRoles;
}
