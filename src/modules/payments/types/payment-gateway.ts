import { Currencies } from '@prisma/client';
import { WayForPayWebhookPayload } from './payment-provider-payload';

export type PaymentGatewayCreateInput = {
  paymentId: string;
  amount: number;
  currency: Currencies;
  postTitle: string;
};

export type PaymentGatewayInitResult = {
  checkoutUrl: string;
  qrCodeUrl?: string;
};

export type PaymentWebhookResult = {
  paymentId: string;
  providerPaymentId?: string;
  status: 'SUCCESS' | 'FAILED' | 'EXPIRED';
  payload: WayForPayWebhookPayload;
};
