import {
  CreatePaymentRequest,
  HandleWebhookRequest,
  PaymentInitResponse,
  PaymentsListRequest,
  PaymentsPage,
  RegeneratePaymentLinkRequest,
  WayForPayWebhookAcknowledge,
} from '../types';

export interface IPaymentsService {
  createPayment(input: CreatePaymentRequest): Promise<PaymentInitResponse>;
  regeneratePaymentLink(input: RegeneratePaymentLinkRequest): Promise<PaymentInitResponse>;
  handleWebhook(input: HandleWebhookRequest): Promise<WayForPayWebhookAcknowledge>;
  listMyPayments(input: PaymentsListRequest): Promise<PaymentsPage>;
}
