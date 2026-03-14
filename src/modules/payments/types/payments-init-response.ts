import { PaymentProvider } from '@prisma/client';

export type PaymentInitResponse = {
  paymentId: string;
  provider: PaymentProvider;
  checkoutUrl: string;
  qrCodeUrl?: string;
};
