import { Inject, Injectable } from '@nestjs/common';
import { Currencies, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces';
import { AppBadRequestException, AppNotFoundException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { CreateAnonymousPaymentDto, CreateUserPaymentDto, PaymentsQueryDto, WayForPayWebhookDto } from '../dtos';
import { IPaymentsService } from '../interfaces';
import { PaymentGatewayFactory } from '../providers';
import { PaymentsRepo } from '../repo';
import { PaymentInitResponse, PaymentsPage, WayForPayWebhookAcknowledge } from '../types';

@Injectable()
export class PaymentsService implements IPaymentsService {
  private readonly DEFAULT_PROVIDER = PaymentProvider.WAYFORPAY;
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly paymentRepo: PaymentsRepo,
    private readonly gatewayFactory: PaymentGatewayFactory,
  ) {}

  async createAnonymousPayment(dto: CreateAnonymousPaymentDto): Promise<PaymentInitResponse> {
    return await this.createPayment({
      postId: dto.postId,
      amount: dto.amount,
      currency: dto.currency ?? Currencies.UAH,
      donorEmail: dto.donorEmail ?? null,
      donorName: dto.donorName ?? null,
      message: dto.message ?? null,
      userId: null,
      provider: dto.provider,
    });
  }

  async createUserPayment(user: AuthenticatedUser, dto: CreateUserPaymentDto): Promise<PaymentInitResponse> {
    return await this.createPayment({
      postId: dto.postId,
      amount: dto.amount,
      currency: dto.currency ?? Currencies.UAH,
      donorEmail: null,
      donorName: null,
      message: dto.message ?? null,
      userId: user.userId,
      provider: dto.provider,
    });
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

    if (payment.provider !== provider) {
      throw new AppBadRequestException('Webhook provider mismatch');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.debug('Duplicate success webhook ignored', {
        paymentId: payment.id,
        provider,
      });

      return gateway.buildWebhookAcknowledge(payment.id);
    }

    if (Number(payment.amount) !== payload.amount) {
      throw new AppBadRequestException('Webhook amount mismatch');
    }

    if (payment.currency !== payload.currency) {
      throw new AppBadRequestException('Webhook currency mismatch');
    }

    const providerPaymentId = webhook.providerPaymentId ?? `${provider.toLowerCase()}_${payment.id}`;

    if (webhook.status === 'SUCCESS') {
      const updated = await this.paymentRepo.updateStatusWithPostIncrement({
        paymentId: payment.id,
        providerPaymentId,
        providerPayload: payload,
      });

      if (!updated) {
        this.logger.debug('Concurrent success webhook ignored', {
          paymentId: payment.id,
          provider,
          providerPaymentId,
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

    const updated = await this.paymentRepo.updateStatusWithoutPostIncrement({
      paymentId: payment.id,
      status: webhook.status === 'EXPIRED' ? PaymentStatus.EXPIRED : PaymentStatus.FAILED,
      providerPaymentId,
      providerPayload: payload,
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
    donorEmail: string | null;
    donorName: string | null;
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
      provider: input.provider,
      referencePaymentId: post.referencePaymentId,
      donorEmail: input.donorEmail,
      donorName: input.donorName,
      message: input.message,
    });

    const gateway = this.gatewayFactory.get(input.provider ?? this.DEFAULT_PROVIDER);

    const checkout = await gateway.createCheckout({
      payment,
      postTitle: post.title,
    });

    await this.paymentRepo.updateStatusWithoutPostIncrement({
      paymentId: payment.id,
      status: PaymentStatus.PENDING,
    });

    return {
      paymentId: payment.id,
      provider: input.provider,
      checkoutUrl: checkout.checkoutUrl,
      qrCodeUrl: checkout.qrCodeUrl,
    };
  }
}
