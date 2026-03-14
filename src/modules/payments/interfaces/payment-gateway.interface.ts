import { PaymentProvider } from '@prisma/client';
import {
  PaymentGatewayCreateInput,
  PaymentGatewayInitResult,
  PaymentWebhookResult,
  WayForPayWebhookAcknowledge,
  WayForPayWebhookPayload,
} from '../types';

export interface IPaymentGateway {
  createCheckout(input: PaymentGatewayCreateInput): Promise<PaymentGatewayInitResult>;
  parseWebhook(payload: WayForPayWebhookPayload): PaymentWebhookResult;
  verifyWebhookSignature(payload: WayForPayWebhookPayload): boolean;
  buildWebhookAcknowledge(orderReference: string): WayForPayWebhookAcknowledge;
}

export interface IPaymentGatewayFactory {
  get(provider: PaymentProvider): IPaymentGateway;
}
