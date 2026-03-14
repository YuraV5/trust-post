import { Payment } from '@prisma/client';
import {
  CreatePaymentInput,
  DonationPost,
  PaymentForRegeneration,
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
  updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean>;
  updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean>;
}
