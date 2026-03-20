import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Currencies, PaymentProvider } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { PaymentsService } from '../../src/modules/payments/services/payments.service';
import { PaymentsRepo } from '../../src/modules/payments/repo';
import { PaymentGatewayFactory } from '../../src/modules/payments/providers';
import { StubAppLogger } from '../__mock__';
import { mockPaymentsRepo, mockGatewayFactory, mockConfig, mockGateway } from './__mock__';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepo, useValue: mockPaymentsRepo },
        { provide: PaymentGatewayFactory, useValue: mockGatewayFactory },
        { provide: ConfigService, useValue: mockConfig },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('throws when amount is zero or negative', async () => {
      await expect(service.createPayment({ postId: 1, amount: 0, userId: 'u1' })).rejects.toThrow(
        'Amount must be greater than zero',
      );
    });

    it('throws when post is not found', async () => {
      mockPaymentsRepo.getPostForDonation.mockResolvedValue(null);

      await expect(service.createPayment({ postId: 99, amount: 100, userId: 'u1' })).rejects.toThrow(
        'Post for donation not found',
      );
    });

    it('throws when payment currency does not match post currency', async () => {
      // Post currency is UAH; passing 'USD' forces a mismatch
      mockPaymentsRepo.getPostForDonation.mockResolvedValue({
        id: 1,
        title: 'Post',
        currency: Currencies.UAH,
        referencePaymentId: 'ref-1',
      });

      await expect(
        service.createPayment({ postId: 1, amount: 50, userId: 'u1', currency: 'USD' as Currencies }),
      ).rejects.toThrow('Payment currency must match post currency');
    });

    it('creates payment and returns checkout url', async () => {
      const post = { id: 1, title: 'Post', currency: Currencies.UAH, referencePaymentId: 'ref-1' };
      const payment = { id: 'pay-1', amount: new Prisma.Decimal('100'), currency: Currencies.UAH };

      mockPaymentsRepo.getPostForDonation.mockResolvedValue(post);
      mockPaymentsRepo.create.mockResolvedValue(payment);
      mockPaymentsRepo.updatePaymentCheckoutState.mockResolvedValue(undefined);
      mockGateway.createCheckout.mockResolvedValue({
        checkoutUrl: 'https://pay.link',
        qrCodeUrl: 'https://qr.link',
      });

      const result = await service.createPayment({ postId: 1, amount: 100, userId: 'u1' });

      expect(result).toEqual({
        paymentId: 'pay-1',
        provider: PaymentProvider.WAYFORPAY,
        checkoutUrl: 'https://pay.link',
        qrCodeUrl: 'https://qr.link',
      });
      expect(mockPaymentsRepo.create).toHaveBeenCalledWith(expect.objectContaining({ postId: 1, userId: 'u1' }));
      // Checkout state must be updated to PENDING after gateway call
      expect(mockPaymentsRepo.updatePaymentCheckoutState).toHaveBeenCalled();
    });
  });

  describe('regeneratePaymentLink', () => {
    it('throws when payment is not eligible for regeneration', async () => {
      mockPaymentsRepo.getPaymentForRegeneration.mockResolvedValue(null);

      await expect(service.regeneratePaymentLink({ paymentId: 'pay-x', userId: 'u1' })).rejects.toThrow(
        'Payment cannot be regenerated',
      );
    });

    it('creates a new payment and returns a new checkout url', async () => {
      const existingPayment = {
        id: 'pay-old',
        postId: 1,
        amount: new Prisma.Decimal('200'),
        currency: Currencies.UAH,
        referencePaymentId: 'ref-1',
        post: { id: 1, title: 'Post', currency: Currencies.UAH, referencePaymentId: 'ref-1' },
      };
      const newPayment = { id: 'pay-new', amount: new Prisma.Decimal('200'), currency: Currencies.UAH };

      mockPaymentsRepo.getPaymentForRegeneration.mockResolvedValue(existingPayment);
      mockPaymentsRepo.create.mockResolvedValue(newPayment);
      mockGateway.createCheckout.mockResolvedValue({
        checkoutUrl: 'https://new.pay.link',
        qrCodeUrl: 'https://qr2.link',
      });

      const result = await service.regeneratePaymentLink({ paymentId: 'pay-old', userId: 'u1' });

      expect(result.paymentId).toBe('pay-new');
      expect(result.checkoutUrl).toBe('https://new.pay.link');
    });
  });

  describe('handleWebhook', () => {
    const basePayload = {
      merchantAccount: 'test-merchant',
      orderReference: 'pay-1',
      merchantSignature: 'valid-sig',
      amount: 100,
      currency: 'UAH',
      transactionStatus: 'Approved',
    };

    it('throws when webhook signature is invalid', async () => {
      mockGateway.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook({ provider: PaymentProvider.WAYFORPAY, payload: basePayload as any }),
      ).rejects.toThrow('Invalid payment webhook signature');
    });

    it('throws when payment is not found by id', async () => {
      mockGateway.verifyWebhookSignature.mockReturnValue(true);
      mockGateway.parseWebhook.mockReturnValue({
        paymentId: 'pay-1',
        status: 'SUCCESS',
        providerPaymentId: 'tx-1',
        payload: basePayload,
      });
      mockPaymentsRepo.findById.mockResolvedValue(null);

      await expect(
        service.handleWebhook({ provider: PaymentProvider.WAYFORPAY, payload: basePayload as any }),
      ).rejects.toThrow('Payment not found');
    });

    it('throws when webhook amount does not match stored payment amount', async () => {
      mockGateway.verifyWebhookSignature.mockReturnValue(true);
      mockGateway.parseWebhook.mockReturnValue({
        paymentId: 'pay-1',
        status: 'SUCCESS',
        providerPaymentId: 'tx-1',
        payload: basePayload,
      });
      // Stored amount 50, but webhook says 100
      mockPaymentsRepo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal('50'),
        currency: Currencies.UAH,
        postId: 1,
      });

      await expect(
        service.handleWebhook({ provider: PaymentProvider.WAYFORPAY, payload: basePayload as any }),
      ).rejects.toThrow('Webhook amount mismatch');
    });

    it('throws when webhook currency does not match stored payment currency', async () => {
      mockGateway.verifyWebhookSignature.mockReturnValue(true);
      mockGateway.parseWebhook.mockReturnValue({
        paymentId: 'pay-1',
        status: 'SUCCESS',
        providerPaymentId: 'tx-1',
        payload: basePayload,
      });
      // Stored currency is 'USD' (cast), but webhook payload says 'UAH'
      mockPaymentsRepo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal('100'),
        currency: 'USD' as Currencies,
        postId: 1,
      });

      await expect(
        service.handleWebhook({ provider: PaymentProvider.WAYFORPAY, payload: basePayload as any }),
      ).rejects.toThrow('Webhook currency mismatch');
    });

    it('confirms successful payment and returns gateway acknowledge', async () => {
      mockGateway.verifyWebhookSignature.mockReturnValue(true);
      mockGateway.parseWebhook.mockReturnValue({
        paymentId: 'pay-1',
        status: 'SUCCESS',
        providerPaymentId: 'tx-1',
        payload: basePayload,
      });
      mockPaymentsRepo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal('100'),
        currency: Currencies.UAH,
        postId: 1,
      });
      mockPaymentsRepo.updateStatusWithPostIncrement.mockResolvedValue(true);
      mockGateway.buildWebhookAcknowledge.mockReturnValue({
        orderReference: 'pay-1',
        status: 'accept',
        time: 1234,
        signature: 'ack-sig',
      });

      const result = await service.handleWebhook({
        provider: PaymentProvider.WAYFORPAY,
        payload: basePayload as any,
      });

      expect(mockPaymentsRepo.updateStatusWithPostIncrement).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: 'pay-1', provider: PaymentProvider.WAYFORPAY }),
      );
      expect(result).toEqual(expect.objectContaining({ status: 'accept', orderReference: 'pay-1' }));
    });

    it('updates payment as FAILED when webhook status is not success', async () => {
      const failedPayload = { ...basePayload, transactionStatus: 'Declined' };

      mockGateway.verifyWebhookSignature.mockReturnValue(true);
      mockGateway.parseWebhook.mockReturnValue({
        paymentId: 'pay-1',
        status: 'FAILED',
        providerPaymentId: null,
        payload: failedPayload,
      });
      mockPaymentsRepo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: new Prisma.Decimal('100'),
        currency: Currencies.UAH,
        postId: 1,
      });
      mockPaymentsRepo.updateStatusWithoutPostIncrement.mockResolvedValue(true);
      mockGateway.buildWebhookAcknowledge.mockReturnValue({
        orderReference: 'pay-1',
        status: 'accept',
        time: 1234,
        signature: 'ack-sig',
      });

      await service.handleWebhook({ provider: PaymentProvider.WAYFORPAY, payload: failedPayload as any });

      expect(mockPaymentsRepo.updateStatusWithoutPostIncrement).toHaveBeenCalled();
    });
  });

  describe('listMyPayments', () => {
    it('clamps limit to MAX_LIMIT (100)', async () => {
      mockPaymentsRepo.listByUserId.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      await service.listMyPayments({ userId: 'u1', limit: 999 });

      expect(mockPaymentsRepo.listByUserId).toHaveBeenCalledWith('u1', expect.objectContaining({ limit: 100 }));
    });

    it('uses default page 1 and limit 10 when omitted', async () => {
      mockPaymentsRepo.listByUserId.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      await service.listMyPayments({ userId: 'u1' });

      expect(mockPaymentsRepo.listByUserId).toHaveBeenCalledWith('u1', expect.objectContaining({ page: 1, limit: 10 }));
    });
  });
});
