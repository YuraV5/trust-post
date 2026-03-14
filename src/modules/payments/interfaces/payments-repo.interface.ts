import { Currencies, Payment, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentProviderPayload, PaymentsListQuery, PaymentsPage } from '../types';

export interface CreatePaymentInput {
  postId: number;
  userId: string | null;
  amount: Prisma.Decimal;
  currency: Currencies;
  provider: PaymentProvider;
  referencePaymentId: string;
  donorEmail: string | null;
  donorName: string | null;
  message: string | null;
  providerPayload?: PaymentProviderPayload;
}

export interface PaymentUpdateWebhookSuccessInput {
  paymentId: string;
  providerPaymentId: string;
  providerPayload: PaymentProviderPayload;
}

export interface PaymentUpdateWebhookStatusInput {
  paymentId: string;
  status: PaymentStatus;
  providerPaymentId?: string;
  providerPayload?: PaymentProviderPayload;
}

export interface IPaymentsRepo {
  create(input: CreatePaymentInput): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  getPostForDonation(
    postId: number,
  ): Promise<{ id: number; title: string; currency: Currencies; referencePaymentId: string } | null>;
  listByUserId(userId: string, query: PaymentsListQuery): Promise<PaymentsPage>;
  updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean>;
  updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean>;
}
