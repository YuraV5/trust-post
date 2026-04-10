import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_REGEX } from '../../../common/validators/regex';
import { UserRoles } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must be at least 8 characters long and contain at least one letter and one number',
  })
  password: string;
}

export class AdminUserCreationDto extends CreateUserDto {
  @ApiProperty({ example: 'USER', enum: UserRoles })
  @IsOptional()
  role?: UserRoles;
}
