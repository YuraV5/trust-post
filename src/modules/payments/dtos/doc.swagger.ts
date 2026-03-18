import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

/**
 * Swagger response schemas for the Payments module.
 * These classes are used only for API documentation and are not DTOs for request validation.
 */

export class PaymentResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Payment ID (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 1,
    description: 'Associated post ID',
  })
  postId: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
    description: 'User ID (null for anonymous payments)',
  })
  userId: string | null;

  @ApiProperty({
    example: 1500,
    description: 'Payment amount in cents/kopiyky',
  })
  amount: number;

  @ApiProperty({
    example: 'UAH',
    description: 'Currency code (UAH, USD, EUR)',
  })
  currency: string;

  @ApiProperty({
    enum: PaymentStatus,
    example: 'COMPLETED',
    description: 'Payment status (PENDING, COMPLETED, FAILED, REFUNDED)',
  })
  status: PaymentStatus;

  @ApiProperty({
    enum: PaymentProvider,
    example: 'WAYFORPAY',
    description: 'Payment provider (WAYFORPAY, STRIPE, etc)',
  })
  provider: PaymentProvider;

  @ApiProperty({
    example: 'https://pay.wayforpay.com/pay?orderReference=ORD-123',
    description: 'Payment URL (send this to user)',
  })
  paymentUrl: string;

  @ApiProperty({
    example: 'ORD-550e8400-e29b-41d4-a716-446655440000',
    description: 'Payment provider order ID',
  })
  providerOrderId: string;

  @ApiProperty({
    example: '2026-01-15T10:30:00Z',
    description: 'Payment creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-15T10:35:00Z',
    nullable: true,
    description: 'Payment completion timestamp',
  })
  completedAt: Date | null;

  @ApiProperty({
    example: '2026-02-15T10:30:00Z',
    nullable: true,
    description: 'Payment expiration timestamp',
  })
  expiresAt: Date | null;
}

export class PaymentInitResponseDto {
  @ApiProperty({
    example: 'https://pay.wayforpay.com/pay?orderReference=ORD-123',
    description: 'Payment URL to redirect user to',
  })
  paymentUrl: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Payment ID for tracking',
  })
  paymentId: string;

  @ApiProperty({
    example: 'ORD-550e8400-e29b-41d4-a716-446655440000',
    description: 'Payment provider order reference',
  })
  orderReference: string;
}

export class PaginatedPaymentsResponseDto {
  @ApiProperty({
    type: [PaymentResponseDto],
    description: 'Array of payments',
  })
  data: PaymentResponseDto[];

  @ApiProperty({
    example: 42,
    description: 'Total number of payments',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Items per page',
  })
  limit: number;
}
