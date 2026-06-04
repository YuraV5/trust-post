import { Injectable } from '@nestjs/common';
import { Currencies, Payment, PaymentStatus, PostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IPaymentsRepo } from '../interfaces';
import {
  CreatePaymentInput,
  PaymentAttemptsHistoryResponse,
  PaymentForRegeneration,
  PaymentPostHistoryResponse,
  PaymentUpdateWebhookStatusInput,
  PaymentUpdateWebhookSuccessInput,
  PaymentWithLastAttempt,
  PaymentsListQuery,
  PaymentsPage,
  UpdatePaymentCheckoutStateInput,
} from '../types';
import { PaymentAttemptsRepo } from './payments-attempts.repo';

@Injectable()
export class PaymentsRepo implements IPaymentsRepo {
  constructor(
    private readonly db: PrismaService,
    private readonly paymentAttemptsRepo: PaymentAttemptsRepo,
  ) {}

  async create(input: CreatePaymentInput): Promise<Payment> {
    return await this.db.payment.create({
      data: {
        postId: input.postId,
        userId: input.userId,
        isAnonymous: input.isAnonymous,
        amount: input.amount,
        currency: input.currency,
        referencePaymentId: input.referencePaymentId,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<PaymentWithLastAttempt | null> {
    return await this.db.payment.findUnique({
      where: { id },
      include: {
        lastAttempt: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });
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

  async getPaymentForRegeneration(paymentId: string, userId: string): Promise<PaymentForRegeneration | null> {
    return await this.db.payment.findFirst({
      where: {
        id: paymentId,
        userId,
        expiredAt: {
          gt: new Date(),
        },
        post: {
          status: PostStatus.APPROVED,
          deletedAt: null,
        },
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            currency: true,
            referencePaymentId: true,
          },
        },
      },
    });
  }

  async updatePaymentCheckoutState(input: UpdatePaymentCheckoutStateInput): Promise<void> {
    await this.db.payment.update({
      where: { id: input.paymentId },
      data: {
        status: input.status,
        expiredAt: input.expiresAt,
        ...(input.status === PaymentStatus.PENDING ? { confirmedAt: null } : {}),
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
        include: {
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          lastAttempt: {
            select: {
              id: true,
              provider: true,
              providerPaymentId: true,
              status: true,
              statusReason: true,
              createdAt: true,
            },
          },
        },
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

  async getPaymentAttemptsByUserId(userId: string, paymentId: string): Promise<PaymentAttemptsHistoryResponse | null> {
    const payment = await this.db.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
      select: {
        id: true,
        status: true,
        statusReason: true,
        isAnonymous: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        paymentAttempts: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            provider: true,
            providerPaymentId: true,
            status: true,
            statusReason: true,
            providerResponse: true,
            createdAt: true,
          },
        },
      },
    });

    if (!payment) {
      return null;
    }

    return {
      paymentId: payment.id,
      paymentStatus: payment.status,
      paymentStatusReason: payment.statusReason,
      isAnonymous: payment.isAnonymous,
      post: payment.post,
      attempts: payment.paymentAttempts,
    };
  }

  async getSuccessfulPostPaymentsHistory(postId: number): Promise<PaymentPostHistoryResponse | null> {
    const post = await this.db.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!post) {
      return null;
    }

    const donations = await this.db.payment.findMany({
      where: {
        postId,
        status: PaymentStatus.SUCCESS,
        confirmedAt: {
          not: null,
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        isAnonymous: true,
        amount: true,
        currency: true,
        confirmedAt: true,
      },
    });

    const donorIds = [...new Set(donations.map((donation) => donation.userId))];
    const donors = donorIds.length > 0
      ? await this.db.user.findMany({
          where: {
            id: {
              in: donorIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];
    const donorNamesById = new Map(donors.map((donor) => [donor.id, donor.name]));

    return {
      post,
      donations: donations.flatMap((donation) => (
        donation.confirmedAt
          ? [{
              paymentId: donation.id,
              donorName: donorNamesById.get(donation.userId) ?? null,
              isAnonymous: donation.isAnonymous,
              amount: donation.amount,
              currency: donation.currency,
              confirmedAt: donation.confirmedAt,
            }]
          : []
      )),
    };
  }

  async updateStatusWithPostIncrement(input: PaymentUpdateWebhookSuccessInput): Promise<boolean> {
    try {
      return await this.db.transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });

        if (!payment) {
          return false;
        }

        const attempt = await this.paymentAttemptsRepo.createInTransaction(tx, {
          paymentId: input.paymentId,
          provider: input.provider,
          providerPaymentId: input.providerPaymentId,
          status: PaymentStatus.SUCCESS,
          providerPayload: input.providerPayload,
        });

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
            lastAttemptId: attempt.id,
            statusReason: input.providerPayload?.reason ?? null,
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }

      throw error;
    }
  }

  async updateStatusWithoutPostIncrement(input: PaymentUpdateWebhookStatusInput): Promise<boolean> {
    try {
      return await this.db.transaction(async (tx) => {
        const attempt = await this.paymentAttemptsRepo.createInTransaction(tx, {
          paymentId: input.paymentId,
          provider: input.provider,
          providerPaymentId: input.providerPaymentId,
          status: input.status,
          providerPayload: input.providerPayload,
        });

        const result = await tx.payment.updateMany({
          where: {
            id: input.paymentId,
            status: {
              not: PaymentStatus.SUCCESS,
            },
          },
          data: {
            status: input.status,
            lastAttemptId: attempt.id,
            ...(input.status === PaymentStatus.EXPIRED ? { expiredAt: new Date() } : {}),
            statusReason: input.providerPayload?.reason ?? null,
          },
        });

        return result.count > 0;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }

      throw error;
    }
  }
}
