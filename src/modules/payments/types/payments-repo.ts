import { Currencies, Payment, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentProviderPayload } from './payments-provider-payload';
import { PaymentAttemptPreview, PaymentsListQuery, PaymentsPage } from './payments-list';

export type CreatePaymentInput = {
  postId: number;
  userId: string;
  isAnonymous: boolean;
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
  lastAttempt: Pick<PaymentAttemptPreview, 'id' | 'provider'> | null;
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

export type PaymentAttemptsHistoryResponse = {
  paymentId: string;
  paymentStatus: PaymentStatus;
  paymentStatusReason: string | null;
  isAnonymous: boolean;
  post: {
    id: number;
    title: string;
  };
  attempts: Array<
    PaymentAttemptPreview & {
      providerResponse: Prisma.JsonValue | null;
    }
  >;
};

export type PaymentPostHistoryResponse = {
  post: {
    id: number;
    title: string;
  };
  donations: Array<{
    paymentId: string;
    donorName: string | null;
    isAnonymous: boolean;
    amount: Prisma.Decimal;
    currency: Currencies;
    confirmedAt: Date;
  }>;
};

export type PaymentsRepo = {
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
};
