// Mock for the payment gateway (WayForPay)
export const mockGateway = {
  createCheckout: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  parseWebhook: jest.fn(),
  buildWebhookAcknowledge: jest.fn(),
};

export const mockGatewayFactory = {
  get: jest.fn(() => mockGateway),
};

export const mockPaymentsRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  getPostForDonation: jest.fn(),
  getPaymentForRegeneration: jest.fn(),
  updatePaymentCheckoutState: jest.fn(),
  listByUserId: jest.fn(),
  updateStatusWithPostIncrement: jest.fn(),
  updateStatusWithoutPostIncrement: jest.fn(),
};

export const mockConfig = {
  get: jest.fn(),
  getOrThrow: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'wayforpay.orderExpiresAt': '3600',
    };
    return config[key] ?? null;
  }),
};
