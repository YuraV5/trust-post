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
  name?: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @MinLength(6)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;
}

export class AdminUserCreationDto extends CreateUserDto {
  @ApiProperty({ example: 'USER', enum: UserRoles })
  @IsOptional()
  role?: UserRoles;
}
