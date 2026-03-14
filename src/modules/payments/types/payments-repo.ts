import { Currencies, Payment, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentProviderPayload } from './payments-provider-payload';
import { PaymentsListQuery, PaymentsPage } from './payments-list';

export type CreatePaymentInput = {
  postId: number;
  userId: string | null;
  amount: Prisma.Decimal;
  currency: Currencies;
  referencePaymentId: string;
};

export type UpdatePaymentCheckoutStateInput = {
  paymentId: string;
  status: PaymentStatus;
  expiresAt?: Date;
};

export type PaymentUpdateWebhookSuccessInput = {
  paymentId: string;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  providerPayload: PaymentProviderPayload;
};

export type PaymentUpdateWebhookStatusInput = {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerPaymentId: string | null;
  providerPayload?: PaymentProviderPayload;
};

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

export type DonationPost = {
  id: number;
  title: string;
  currency: Currencies;
  referencePaymentId: string;
};

export type PaymentsRepo = {
  create(input: CreatePaymentInput): Promise<Payment>;
  findById(id: string): Promise<PaymentWithLastAttempt | null>;
  getPostForDonation(postId: number): Promise<DonationPost | null>;
  getPaymentForRegeneration(paymentId: string, userId: string): Promise<PaymentForRegeneration | null>;
  updatePaymentCheckoutState(input: UpdatePaymentCheckoutStateInput): Promise<void>;
  listByUserId(userId: string, query: PaymentsListQuery): Promise<PaymentsPage>;
  updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean>;
  updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean>;
};
