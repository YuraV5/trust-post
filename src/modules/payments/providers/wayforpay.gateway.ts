import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider } from '@prisma/client';
import { WayForPayCheckoutPayload, WayForPayWebhookAcknowledge, WayForPayWebhookPayload } from '../types';
import { IPaymentGateway } from '../interfaces';
import { executeWithRetry } from '../../../common/utils';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { PaymentGatewayCreateInput, PaymentGatewayInitResult, PaymentWebhookResult } from '../types/payments-gateway';

type WayForPayCheckoutResponse = {
  invoiceUrl: string;
  qrCode?: string;
};

@Injectable()
export class WayForPayGateway implements IPaymentGateway {
  readonly provider = PaymentProvider.WAYFORPAY;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {}

  async createCheckout(input: PaymentGatewayCreateInput): Promise<PaymentGatewayInitResult> {
    const merchantAccount = this.config.getOrThrow<string>('wayforpay.merchantAccount');
    const merchantDomainName = this.config.getOrThrow<string>('wayforpay.merchantDomainName');

    const orderDate = Math.floor(Date.now() / 1000);

    const payloadBase: WayForPayCheckoutPayload = {
      transactionType: 'CREATE_INVOICE',
      merchantAccount,
      merchantDomainName,
      apiVersion: '1',
      orderReference: input.paymentId,
      orderDate,
      language: 'en',
      amount: input.amount,
      currency: input.currency,
      orderTimeout: Number(this.config.get('wayforpay.orderExpiresAt')) || 3600,
      productName: [input.postTitle],
      productPrice: [input.amount],
      productCount: [1],
      returnUrl: this.config.getOrThrow<string>('wayforpay.returnUrl'),
      serviceUrl: this.config.getOrThrow<string>('wayforpay.serviceUrl'),
      notifyMethod: 'email',
      paymentSystem: 'card',
    };

    const signatureSource = [
      payloadBase.merchantAccount,
      payloadBase.merchantDomainName,
      payloadBase.orderReference,
      String(payloadBase.orderDate),
      String(payloadBase.amount),
      payloadBase.currency,
      payloadBase.productName.join(';'),
      payloadBase.productCount.join(';'),
      payloadBase.productPrice.join(';'),
    ].join(';');

    const merchantSignature = this.sign(signatureSource);

    payloadBase.merchantSignature = merchantSignature;

    const paymentRequestUrl = await executeWithRetry((signal) => this.requestPaymentUrl(payloadBase, signal), {
      maxRetries: 2,
      timeoutMs: 1000,
      exponentialBackoff: true,
    });

    this.logger.debug('WayForPay create checkout response', { paymentRequestUrl });

    return {
      checkoutUrl: paymentRequestUrl.invoiceUrl,
      qrCodeUrl: paymentRequestUrl.qrCode,
    };
  }

  parseWebhook(payload: WayForPayWebhookPayload): PaymentWebhookResult {
    return {
      paymentId: payload.orderReference,
      providerPaymentId: payload.transactionId,
      status: this.mapWebhookStatus(payload.transactionStatus),
      payload,
    };
  }

  verifyWebhookSignature(payload: WayForPayWebhookPayload): boolean {
    const signatureSource = [
      payload.merchantAccount,
      payload.orderReference,
      String(payload.amount),
      payload.currency,
      payload.authCode ?? '',
      payload.cardPan ?? '',
      payload.transactionStatus,
      String(payload.reasonCode ?? ''),
    ].join(';');

    const expected = this.sign(signatureSource);
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(payload.merchantSignature ?? '', 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  }

  buildWebhookAcknowledge(orderReference: string): WayForPayWebhookAcknowledge {
    const time = Math.floor(Date.now() / 1000);
    const signatureSource = `${orderReference};accept;${time}`;

    return {
      orderReference,
      status: 'accept',
      time,
      signature: this.sign(signatureSource),
    };
  }

  private async requestPaymentUrl(
    payload: WayForPayCheckoutPayload,
    signal?: AbortSignal,
  ): Promise<WayForPayCheckoutResponse> {
    const result = await fetch(this.config.getOrThrow<string>('wayforpay.apiUrl'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!result.ok) {
      const errorBody = await result.text();
      const error = new Error(`WayForPay create checkout failed with status ${result.status}: ${errorBody}`);
      (error as { status?: number }).status = result.status;
      throw error;
    }

    this.logger.debug('WayForPay create checkout response', { resultStatus: result.status });
    return result.json() as Promise<WayForPayCheckoutResponse>;
  }

  private mapWebhookStatus(status: string): 'SUCCESS' | 'FAILED' | 'EXPIRED' {
    const normalized = status.trim().toLowerCase();

    if (normalized === 'approved') {
      return 'SUCCESS';
    }

    if (normalized === 'expired') {
      return 'EXPIRED';
    }

    return 'FAILED';
  }

  private sign(value: string): string {
    const secret = this.config.getOrThrow<string>('wayforpay.secretKey');
    return createHmac('md5', secret).update(value).digest('hex');
  }
}
