import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentProviderPayload } from './payments-provider-payload';

export type CreatePaymentAttemptInput = {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerPaymentId: string | null;
  providerPayload?: PaymentProviderPayload;
};
