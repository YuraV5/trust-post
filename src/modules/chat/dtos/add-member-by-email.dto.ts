import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AddMemberByEmailDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email: string;
}
