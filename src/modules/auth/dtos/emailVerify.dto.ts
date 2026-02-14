import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsUUID } from 'class-validator';

export class VerifyEmailParamsDto {
  @ApiProperty({
    description: "The UUID token sent to the user's email for verification",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'Invalid UUID format' })
  uuid: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    description: 'The email address to resend the verification link to',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
