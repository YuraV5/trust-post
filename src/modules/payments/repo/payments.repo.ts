import { Injectable } from '@nestjs/common';
import { Currencies, Payment, PaymentStatus, PostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePaymentInput,
  IPaymentsRepo,
  PaymentUpdateWebhookStatusInput,
  PaymentUpdateWebhookSuccessInput,
} from '../interfaces';
import { PaymentsListQuery, PaymentsPage } from '../types';

@Injectable()
export class PaymentsRepo implements IPaymentsRepo {
  constructor(private readonly db: PrismaService) {}

  async create(input: CreatePaymentInput): Promise<Payment> {
    return await this.db.payment.create({
      data: {
        postId: input.postId,
        userId: input.userId,
        amount: input.amount,
        currency: input.currency,
        provider: input.provider,
        referencePaymentId: input.referencePaymentId,
        donorEmail: input.donorEmail,
        donorName: input.donorName,
        message: input.message,
        providerPayload: input.providerPayload,
      },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return await this.db.payment.findUnique({ where: { id } });
  }

  async getPostForDonation(
    postId: number,
  ): Promise<{ id: number; title: string; currency: Currencies; referencePaymentId: string } | null> {
    return await this.db.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        currency: true,
        referencePaymentId: true,
      },
    });
  }

  async listByUserId(userId: string, query: PaymentsListQuery): Promise<PaymentsPage> {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.PaymentWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.postId ? { postId: query.postId } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.db.payment.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });

      if (!payment) {
        return false;
      }

      const updateResult = await tx.payment.updateMany({
        where: {
          id: input.paymentId,
          status: {
            not: PaymentStatus.SUCCESS,
          },
        },
        data: {
          status: PaymentStatus.SUCCESS,
          confirmedAt: new Date(),
          providerPaymentId: input.providerPaymentId,
          providerPayload: input.providerPayload,
        },
      });

      if (updateResult.count === 0) {
        return false;
      }

      await tx.post.update({
        where: { id: payment.postId },
        data: {
          currentAmount: {
            increment: payment.amount,
          },
        },
      });

      return true;
    });
  }

  async updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean> {
    const result = await this.db.payment.updateMany({
      where: {
        id: input.paymentId,
        status: {
          not: PaymentStatus.SUCCESS,
        },
      },
      data: {
        status: input.status,
        providerPaymentId: input.providerPaymentId,
        providerPayload: input.providerPayload,
      },
    });

    return result.count > 0;
  }
}
