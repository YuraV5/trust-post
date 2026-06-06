import {
  CreatePaymentRequest,
  HandleWebhookRequest,
  PaymentAttemptsHistoryRequest,
  PaymentAttemptsHistoryResponse,
  PaymentInitResponse,
  PaymentPostHistoryRequest,
  PaymentPostHistoryResponse,
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
  getMyPaymentAttempts(input: PaymentAttemptsHistoryRequest): Promise<PaymentAttemptsHistoryResponse>;
  getPostDonationHistory(input: PaymentPostHistoryRequest): Promise<PaymentPostHistoryResponse>;
}
