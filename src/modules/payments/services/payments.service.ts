import { Inject, Injectable } from '@nestjs/common';
import { Currencies, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces';
import { AppBadRequestException, AppNotFoundException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import {
  CreateAnonymousPaymentDto,
  CreateUserPaymentDto,
  PaymentsQueryDto,
  RegeneratePaymentLinkDto,
  WayForPayWebhookDto,
} from '../dtos';
import { IPaymentsService } from '../interfaces';
import { PaymentGatewayFactory } from '../providers';
import { PaymentsRepo } from '../repo';
import { PaymentInitResponse, PaymentsPage, WayForPayWebhookAcknowledge } from '../types';
import { ConfigService } from '@nestjs/config/dist/config.service';

const CARDHOLDER_SESSION_EXPIRED = 'Cardholder session expired';

@Injectable()
export class PaymentsService implements IPaymentsService {
  private readonly DEFAULT_PROVIDER = PaymentProvider.WAYFORPAY;
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly paymentRepo: PaymentsRepo,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly config: ConfigService,
  ) {}

  async createAnonymousPayment(data: CreateAnonymousPaymentDto): Promise<PaymentInitResponse> {
    return await this.createPayment({
      postId: data.postId,
      amount: data.amount,
      currency: data.currency ?? Currencies.UAH,
      message: data.message ?? null,
      userId: null,
      provider: data.provider ?? this.DEFAULT_PROVIDER,
    });
  }

  async createUserPayment(user: AuthenticatedUser, data: CreateUserPaymentDto): Promise<PaymentInitResponse> {
    return await this.createPayment({
      postId: data.postId,
      amount: data.amount,
      currency: data.currency ?? Currencies.UAH,
      message: data.message ?? null,
      userId: user.userId,
      provider: data.provider ?? this.DEFAULT_PROVIDER,
    });
  }

  async regeneratePaymentLink(
    userId: string,
    paymentId: string,
    inp: RegeneratePaymentLinkDto,
  ): Promise<PaymentInitResponse> {
    const provider = inp.provider ?? this.DEFAULT_PROVIDER;

    const payment = await this.paymentRepo.getPaymentForRegeneration(paymentId, userId);

    if (!payment) {
      throw new AppBadRequestException(
        'Payment cannot be regenerated. Ensure payment status is pending or failed, payment is not expired, and post is approved',
      );
    }

    const newPayment = await this.paymentRepo.create({
      postId: payment.postId,
      userId,
      amount: payment.amount,
      currency: payment.currency,
      referencePaymentId: payment.referencePaymentId,
    });

    const gateway = this.gatewayFactory.get(provider);

    const checkout = await gateway.createCheckout({
      paymentId: newPayment.id,
      amount: Number(newPayment.amount),
      currency: newPayment.currency,
      postTitle: payment.post.title,
    });

    return {
      paymentId: newPayment.id,
      provider,
      checkoutUrl: checkout.checkoutUrl,
      qrCodeUrl: checkout.qrCodeUrl,
    };
  }

  async handleWebhook(provider: PaymentProvider, payload: WayForPayWebhookDto): Promise<WayForPayWebhookAcknowledge> {
    const gateway = this.gatewayFactory.get(provider);

    if (!gateway.verifyWebhookSignature(payload)) {
      throw new AppBadRequestException('Invalid payment webhook signature');
    }

    const webhook = gateway.parseWebhook(payload);
    const payment = await this.paymentRepo.findById(webhook.paymentId);

    if (!payment) {
      throw new AppNotFoundException('Payment not found');
    }

    if (Number(payment.amount) !== payload.amount) {
      throw new AppBadRequestException('Webhook amount mismatch');
    }

    if (payment.currency !== payload.currency) {
      throw new AppBadRequestException('Webhook currency mismatch');
    }

    if (webhook.status === 'SUCCESS') {
      const updated = await this.paymentRepo.updateStatusWithPostIncrement({
        paymentId: payment.id,
        provider,
        providerPaymentId: webhook.providerPaymentId ?? null,
        providerPayload: payload,
      });

      if (!updated) {
        this.logger.debug('Concurrent success webhook ignored', {
          paymentId: payment.id,
          provider,
          providerPaymentId: webhook.providerPaymentId ?? null,
        });

        return gateway.buildWebhookAcknowledge(payment.id);
      }

      this.logger.info('Payment confirmed', {
        paymentId: payment.id,
        postId: payment.postId,
        provider,
      });

      return gateway.buildWebhookAcknowledge(payment.id);
    }

    const isSessionExpired = webhook.payload.reason === CARDHOLDER_SESSION_EXPIRED;

    const updated = await this.paymentRepo.updateStatusWithoutPostIncrement({
      paymentId: payment.id,
      provider,
      status: isSessionExpired ? PaymentStatus.EXPIRED : PaymentStatus.FAILED,
      providerPaymentId: webhook.providerPaymentId ?? null,
      providerPayload: payload,
      message: webhook.payload.reason,
    });

    if (!updated) {
      this.logger.debug('Terminal webhook ignored because payment already confirmed', {
        paymentId: payment.id,
        provider,
        status: webhook.status,
      });

      return gateway.buildWebhookAcknowledge(payment.id);
    }

    this.logger.info('Payment not successful', {
      paymentId: payment.id,
      postId: payment.postId,
      provider,
      status: webhook.status,
    });

    return gateway.buildWebhookAcknowledge(payment.id);
  }

  async listMyPayments(userId: string, query: PaymentsQueryDto): Promise<PaymentsPage> {
    const limit = Math.min(Math.max(query.limit ?? 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page ?? 1, 1);

    return await this.paymentRepo.listByUserId(userId, {
      page,
      limit,
      status: query.status,
      postId: query.postId,
    });
  }

  private async createPayment(input: {
    postId: number;
    amount: number;
    currency: Currencies;
    message: string | null;
    userId: string | null;
    provider: PaymentProvider;
  }): Promise<PaymentInitResponse> {
    if (input.amount <= 0) {
      throw new AppBadRequestException('Amount must be greater than zero');
    }

    const post = await this.paymentRepo.getPostForDonation(input.postId);

    if (!post) {
      throw new AppNotFoundException('Post for donation not found');
    }

    if (post.currency !== input.currency) {
      throw new AppBadRequestException('Payment currency must match post currency');
    }

    const payment = await this.paymentRepo.create({
      postId: post.id,
      userId: input.userId,
      amount: new Prisma.Decimal(String(input.amount)),
      currency: input.currency,
      referencePaymentId: post.referencePaymentId,
    });

    const provider = input.provider ?? this.DEFAULT_PROVIDER;
    const gateway = this.gatewayFactory.get(provider);

    const checkout = await gateway.createCheckout({
      paymentId: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      postTitle: post.title,
    });

    await this.paymentRepo.updatePaymentCheckoutState({
      paymentId: payment.id,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + (Number(this.config.get('wayforpay.orderExpiresAt')) ?? 3600) * 1000),
    });

    return {
      paymentId: payment.id,
      provider,
      checkoutUrl: checkout.checkoutUrl,
      qrCodeUrl: checkout.qrCodeUrl,
    };
  }
}
