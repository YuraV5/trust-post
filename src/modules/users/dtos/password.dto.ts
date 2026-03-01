import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_REGEX } from '../../../common/validators/regex';

export class UpdatePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({})
  @IsString()
  @MinLength(6)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain at least one letter and one number',
  })
  newPassword: string;
}
