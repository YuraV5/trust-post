import { ApiProperty } from '@nestjs/swagger';
import { Currencies, PaymentProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateAnonymousPaymentDto {
  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId: number;

  @ApiProperty({ example: 100.5 })
  @Type(() => Number)
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: Currencies, example: Currencies.UAH })
  @IsEnum(Currencies)
  currency: Currencies;

  @ApiProperty({ example: 'anonymous.donor@example.com', required: false })
  @IsOptional()
  @IsEmail()
  donorEmail?: string;

  @ApiProperty({ example: 'Anonymous Donor', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  donorName?: string;

  @ApiProperty({ example: 'Some message', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message?: string;

  @ApiProperty({ example: 'wayforpay', enum: ['wayforpay', 'paypal'], required: false })
  @IsOptional()
  @IsEnum([PaymentProvider.WAYFORPAY])
  provider: PaymentProvider;
}
