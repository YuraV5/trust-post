import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class RegeneratePaymentLinkDto {
  @ApiProperty({ example: 'wayforpay', enum: ['wayforpay'] })
  @IsOptional()
  @IsEnum([PaymentProvider.WAYFORPAY], { message: `Provider must be one of: ${PaymentProvider.WAYFORPAY}` })
  provider?: PaymentProvider;
}
