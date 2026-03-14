import { Injectable } from '@nestjs/common';
import { PaymentAttempt, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentProviderPayload } from '../types';

type CreatePaymentAttemptInput = {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerPaymentId: string | null;
  providerPayload?: PaymentProviderPayload;
  message?: string;
};

@Injectable()
export class PaymentAttemptsRepo {
  async createInTransaction(
    tx: Prisma.TransactionClient,
    input: CreatePaymentAttemptInput,
  ): Promise<Pick<PaymentAttempt, 'id'>> {
    return await tx.paymentAttempt.create({
      data: {
        paymentId: input.paymentId,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        status: input.status,
        providerResponse: input.providerPayload,
        message: this.getAttemptMessage(input.providerPayload),
      },
      select: {
        id: true,
      },
    });
  }

  private getAttemptMessage(payload?: PaymentProviderPayload): string | null {
    if (!payload || !('reason' in payload)) {
      return null;
    }

    return typeof payload.reason === 'string' && payload.reason.trim().length > 0 ? payload.reason : null;
  }
}
