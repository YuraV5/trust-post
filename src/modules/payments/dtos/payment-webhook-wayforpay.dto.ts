import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class WayForPayWebhookDto {
  @ApiProperty({ example: 'merchant@example.com' })
  @IsString()
  merchantAccount: string;

  @ApiProperty({ example: 'payment-uuid' })
  @IsString()
  orderReference: string;

  @ApiProperty({ example: 'signature_hash' })
  @IsString()
  merchantSignature: string;

  @ApiProperty({ example: 100.5 })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'UAH' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'Approved' })
  @IsString()
  transactionStatus: string;

  @ApiProperty({ example: 'tx_123', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  authCode?: string;

  @ApiProperty({ example: '414943xxxxxx1111', required: false })
  @IsOptional()
  @IsString()
  cardPan?: string;

  @ApiProperty({ example: 1101, required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  reasonCode?: number;

  @ApiProperty({ example: 'OK', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ example: 1.5, required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  fee?: number;

  @ApiProperty({ example: 'card', required: false })
  @IsOptional()
  @IsString()
  paymentSystem?: string;

  @ApiProperty({ example: 1710324887, required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  createdDate?: number;

  @ApiProperty({ example: 1710324893, required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  processingDate?: number;
}
