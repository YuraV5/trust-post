import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '../../../common/validation/regex';

export class SetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @Matches(PASSWORD_REGEX)
  password: string;

  @ApiProperty({ example: 'confirmPassword123' })
  @IsString()
  @Matches(PASSWORD_REGEX)
  confirmPassword: string;
}
