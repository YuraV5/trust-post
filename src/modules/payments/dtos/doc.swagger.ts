import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

export class PaymentPostPreviewDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Help for evacuation vehicle' })
  title: string;
}

export class PaymentAttemptPreviewDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440099' })
  id: string;

  @ApiProperty({ enum: PaymentProvider, example: 'WAYFORPAY' })
  provider: PaymentProvider;

  @ApiProperty({ example: 'wfp-order-10001', nullable: true })
  providerPaymentId: string | null;

  @ApiProperty({ enum: PaymentStatus, example: 'FAILED' })
  status: PaymentStatus;

  @ApiProperty({ example: 'Cardholder session expired', nullable: true })
  statusReason: string | null;

  @ApiProperty({ example: '2026-06-04T10:30:00Z' })
  createdAt: Date;
}

export class PaymentAttemptHistoryItemDto extends PaymentAttemptPreviewDto {
  @ApiProperty({
    example: { reason: 'Cardholder session expired' },
    nullable: true,
    description: 'Raw provider response payload',
  })
  providerResponse: Record<string, unknown> | null;
}

export class PaymentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 1 })
  postId: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', nullable: true })
  userId: string | null;

  @ApiProperty({ example: false })
  isAnonymous: boolean;

  @ApiProperty({ example: '1500.00' })
  amount: string;

  @ApiProperty({ example: 'UAH' })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, example: 'SUCCESS' })
  status: PaymentStatus;

  @ApiProperty({ example: 'Cardholder session expired', nullable: true })
  statusReason: string | null;

  @ApiProperty({ example: 'post-ref-12345' })
  referencePaymentId: string;

  @ApiProperty({ example: '2026-06-04T10:35:00Z', nullable: true })
  confirmedAt: Date | null;

  @ApiProperty({ example: '2026-06-04T10:45:00Z', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ example: '2026-06-04T10:20:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-04T10:21:00Z' })
  updatedAt: Date;

  @ApiProperty({ type: () => PaymentPostPreviewDto })
  post: PaymentPostPreviewDto;

  @ApiProperty({ type: () => PaymentAttemptPreviewDto, nullable: true })
  lastAttempt: PaymentAttemptPreviewDto | null;
}

export class PaymentInitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  paymentId: string;

  @ApiProperty({ enum: PaymentProvider, example: 'WAYFORPAY' })
  provider: PaymentProvider;

  @ApiProperty({ example: 'https://pay.wayforpay.com/pay?orderReference=ORD-123' })
  checkoutUrl: string;

  @ApiProperty({
    example: 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=example',
    required: false,
  })
  qrCodeUrl?: string;
}

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  data: PaymentResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class PaymentAttemptsHistoryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  paymentId: string;

  @ApiProperty({ enum: PaymentStatus, example: 'FAILED' })
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 'Cardholder session expired', nullable: true })
  paymentStatusReason: string | null;

  @ApiProperty({ example: true })
  isAnonymous: boolean;

  @ApiProperty({ type: () => PaymentPostPreviewDto })
  post: PaymentPostPreviewDto;

  @ApiProperty({ type: [PaymentAttemptHistoryItemDto] })
  attempts: PaymentAttemptHistoryItemDto[];
}

export class PaymentPostDonationHistoryItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  paymentId: string;

  @ApiProperty({ example: 'Ivan Petrenko', nullable: true, description: 'Donor name when donation is not anonymous' })
  donorName: string | null;

  @ApiProperty({ example: false })
  isAnonymous: boolean;

  @ApiProperty({ example: '1500.00' })
  amount: string;

  @ApiProperty({ example: 'UAH' })
  currency: string;

  @ApiProperty({ example: '2026-06-04T10:35:00Z' })
  confirmedAt: Date;
}

export class PaymentPostDonationHistoryResponseDto {
  @ApiProperty({ type: () => PaymentPostPreviewDto })
  post: PaymentPostPreviewDto;

  @ApiProperty({ type: [PaymentPostDonationHistoryItemDto] })
  donations: PaymentPostDonationHistoryItemDto[];
}
