import { Payment } from '@prisma/client';
import { PaymentProviderPayload, WayForPayWebhookPayload } from './payment-provider-payload';

export type PaymentGatewayCreateInput = {
  payment: Payment;
  postTitle: string;
};

export type PaymentGatewayInitResult = {
  checkoutUrl: string;
  qrCodeUrl?: string;
  payload: PaymentProviderPayload;
};

export type PaymentWebhookResult = {
  paymentId: string;
  providerPaymentId?: string;
  status: 'SUCCESS' | 'FAILED' | 'EXPIRED';
  payload: WayForPayWebhookPayload;
};
