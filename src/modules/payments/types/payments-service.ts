import { Currencies, PaymentProvider, PaymentStatus } from '@prisma/client';
import { WayForPayWebhookPayload } from './payments-provider-payload';

export type CreatePaymentRequest = {
  postId: number;
  amount: number;
  currency?: Currencies;
  userId: string | null;
  provider?: PaymentProvider;
};

export type RegeneratePaymentLinkRequest = {
  userId: string;
  paymentId: string;
  provider?: PaymentProvider;
};

export type PaymentsListRequest = {
  userId: string;
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  postId?: number;
};

export type HandleWebhookRequest = {
  provider: PaymentProvider;
  payload: WayForPayWebhookPayload;
};
