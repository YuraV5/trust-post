import { ApiProperty } from '@nestjs/swagger';
import { Currencies, PaymentProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateUserPaymentDto {
  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId: number;

  @ApiProperty({ example: 250 })
  @Type(() => Number)
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: Currencies, example: Currencies.UAH })
  @IsEnum(Currencies)
  currency: Currencies;

  @ApiProperty({ example: 'Donation from user', required: false })
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
