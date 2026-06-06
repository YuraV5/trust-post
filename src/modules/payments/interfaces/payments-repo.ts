import { Payment } from '@prisma/client';
import {
  CreatePaymentInput,
  DonationPost,
  PaymentAttemptsHistoryResponse,
  PaymentForRegeneration,
  PaymentPostHistoryResponse,
  PaymentsListQuery,
  PaymentsPage,
  PaymentUpdateWebhookStatusInput,
  PaymentUpdateWebhookSuccessInput,
  PaymentWithLastAttempt,
  UpdatePaymentCheckoutStateInput,
} from '../types';

export interface IPaymentsRepo {
  create(input: CreatePaymentInput): Promise<Payment>;
  findById(id: string): Promise<PaymentWithLastAttempt | null>;
  getPostForDonation(postId: number): Promise<DonationPost | null>;
  getPaymentForRegeneration(paymentId: string, userId: string): Promise<PaymentForRegeneration | null>;
  updatePaymentCheckoutState(input: UpdatePaymentCheckoutStateInput): Promise<void>;
  listByUserId(userId: string, query: PaymentsListQuery): Promise<PaymentsPage>;
  getPaymentAttemptsByUserId(userId: string, paymentId: string): Promise<PaymentAttemptsHistoryResponse | null>;
  getSuccessfulPostPaymentsHistory(postId: number): Promise<PaymentPostHistoryResponse | null>;
  updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean>;
  updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean>;
}
