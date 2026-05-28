import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_REGEX } from '../../../common/validators/regex';

export class SetPasswordDto {
  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must be at least 8 characters long and contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({ example: 'confirmPassword123' })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must be at least 8 characters long and contain at least one letter and one number',
  })
  confirmPassword: string;
}
