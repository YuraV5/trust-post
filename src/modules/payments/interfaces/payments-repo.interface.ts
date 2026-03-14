import { Currencies, Payment, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentProviderPayload, PaymentsListQuery, PaymentsPage } from '../types';

export interface CreatePaymentInput {
  postId: number;
  userId: string | null;
  amount: Prisma.Decimal;
  currency: Currencies;
  referencePaymentId: string;
}

export interface UpdatePaymentCheckoutStateInput {
  paymentId: string;
  status: PaymentStatus;
  expiresAt?: Date;
}

export interface PaymentUpdateWebhookSuccessInput {
  paymentId: string;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  providerPayload: PaymentProviderPayload;
}

export interface PaymentUpdateWebhookStatusInput {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerPaymentId: string | null;
  providerPayload?: PaymentProviderPayload;
  message?: string;
}

export type PaymentWithLastAttempt = Payment & {
  lastAttempt: {
    id: string;
    provider: PaymentProvider;
  } | null;
};

export type PaymentForRegeneration = Payment & {
  post: {
    id: number;
    title: string;
    currency: Currencies;
    referencePaymentId: string;
  };
};

export interface IPaymentsRepo {
  create(input: CreatePaymentInput): Promise<Payment>;
  findById(id: string): Promise<PaymentWithLastAttempt | null>;
  getPostForDonation(
    postId: number,
  ): Promise<{ id: number; title: string; currency: Currencies; referencePaymentId: string } | null>;
  getPaymentForRegeneration(paymentId: string, userId: string): Promise<PaymentForRegeneration | null>;
  updatePaymentCheckoutState(input: UpdatePaymentCheckoutStateInput): Promise<void>;
  listByUserId(userId: string, query: PaymentsListQuery): Promise<PaymentsPage>;
  updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean>;
  updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean>;
}
