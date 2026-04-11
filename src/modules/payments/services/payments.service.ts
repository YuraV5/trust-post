import { Inject, Injectable } from '@nestjs/common';
import { Currencies, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { IPaymentsService } from '../interfaces';
import { PaymentGatewayFactory } from '../providers';
import { PaymentsRepo } from '../repo';
import { ConfigService } from '@nestjs/config/dist/config.service';
import {
  CreatePaymentRequest,
  HandleWebhookRequest,
  PaymentInitResponse,
  PaymentsListRequest,
  PaymentsPage,
  RegeneratePaymentLinkRequest,
  WayForPayWebhookAcknowledge,
} from '../types';

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

  async createPayment(input: CreatePaymentRequest): Promise<PaymentInitResponse> {
    if (input.amount <= 0) {
      throw new AppBadRequestException('Amount must be greater than zero');
    }

    const post = await this.paymentRepo.getPostForDonation(input.postId);

    if (!post) {
      throw new AppNotFoundException('Post for donation not found');
    }

    const currency = input.currency ?? Currencies.UAH;
    if (post.currency !== currency) {
      throw new AppBadRequestException('Payment currency must match post currency');
    }

    const payment = await this.paymentRepo.create({
      postId: post.id,
      userId: input.userId,
      amount: new Prisma.Decimal(String(input.amount)),
      currency,
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
      expiresAt: new Date(Date.now() + Number(this.config.getOrThrow('wayforpay.orderExpiresAt')) * 1000),
    });

    return {
      paymentId: payment.id,
      provider,
      checkoutUrl: checkout.checkoutUrl,
      qrCodeUrl: checkout.qrCodeUrl,
    };
  }

  async regeneratePaymentLink(input: RegeneratePaymentLinkRequest): Promise<PaymentInitResponse> {
    const provider = input.provider ?? this.DEFAULT_PROVIDER;

    const payment = await this.paymentRepo.getPaymentForRegeneration(input.paymentId, input.userId);

    if (!payment) {
      throw new AppBadRequestException(
        'Payment cannot be regenerated. Ensure payment status is pending or failed, payment is not expired, and post is approved',
      );
    }

    const newPayment = await this.paymentRepo.create({
      postId: payment.postId,
      userId: input.userId,
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

  async handleWebhook(input: HandleWebhookRequest): Promise<WayForPayWebhookAcknowledge> {
    const gateway = this.gatewayFactory.get(input.provider);

    if (!gateway.verifyWebhookSignature(input.payload)) {
      throw new AppBadRequestException('Invalid payment webhook signature');
    }

    const webhook = gateway.parseWebhook(input.payload);
    const payment = await this.paymentRepo.findById(webhook.paymentId);

    if (!payment) {
      throw new AppNotFoundException('Payment not found');
    }

    if (Number(payment.amount) !== input.payload.amount) {
      throw new AppBadRequestException('Webhook amount mismatch');
    }

    if (payment.currency !== input.payload.currency) {
      throw new AppBadRequestException('Webhook currency mismatch');
    }

    if (webhook.status === 'SUCCESS') {
      const updated = await this.paymentRepo.updateStatusWithPostIncrement({
        paymentId: payment.id,
        provider: input.provider,
        providerPaymentId: webhook.providerPaymentId ?? null,
        providerPayload: input.payload,
      });

      if (!updated) {
        this.logger.debug('Concurrent success webhook ignored', {
          paymentId: payment.id,
          provider: input.provider,
          providerPaymentId: webhook.providerPaymentId ?? null,
        });

        return gateway.buildWebhookAcknowledge(payment.id);
      }

      this.logger.info('Payment confirmed', {
        paymentId: payment.id,
        postId: payment.postId,
        provider: input.provider,
      });

      return gateway.buildWebhookAcknowledge(payment.id);
    }

    const isSessionExpired = webhook.payload.reason === 'Cardholder session expired';

    const updated = await this.paymentRepo.updateStatusWithoutPostIncrement({
      paymentId: payment.id,
      provider: input.provider,
      status: isSessionExpired ? PaymentStatus.EXPIRED : PaymentStatus.FAILED,
      providerPaymentId: webhook.providerPaymentId ?? null,
      providerPayload: input.payload,
    });

    if (!updated) {
      this.logger.debug('Terminal webhook ignored because payment already confirmed', {
        paymentId: payment.id,
        provider: input.provider,
        status: webhook.status,
      });

      return gateway.buildWebhookAcknowledge(payment.id);
    }

    this.logger.info('Payment not successful', {
      paymentId: payment.id,
      postId: payment.postId,
      provider: input.provider,
      status: webhook.status,
    });

    return gateway.buildWebhookAcknowledge(payment.id);
  }

  async listMyPayments(input: PaymentsListRequest): Promise<PaymentsPage> {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), this.MAX_LIMIT);
    const page = Math.max(input.page ?? 1, 1);

    return await this.paymentRepo.listByUserId(input.userId, {
      page,
      limit,
      status: input.status,
      postId: input.postId,
    });
  }
}
