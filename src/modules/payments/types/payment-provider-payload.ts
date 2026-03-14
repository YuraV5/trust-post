type TransactionType = 'CREATE_INVOICE';

type Currencies = 'USD' | 'EUR' | 'UAH';

type MethodPaymentSystem = 'card' | 'applepay' | 'googlepay';

export type WayForPayCheckoutPayload = {
  transactionType: TransactionType;
  merchantAccount: string;
  apiVersion: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  language: string;
  orderTimeout: number;
  currency: Currencies;
  productName: string[];
  productPrice: number[];
  productCount: number[];
  returnUrl: string;
  serviceUrl: string;
  clientFirstName?: string;
  clientEmail?: string;
  merchantSignature?: string;
  notifyMethod: string;
  paymentSystem: MethodPaymentSystem;
};

export type WayForPayWebhookPayload = {
  merchantAccount: string;
  orderReference: string;
  merchantSignature: string;
  amount: number;
  currency: string;
  authCode?: string;
  cardPan?: string;
  transactionStatus: string;
  reasonCode?: number;
  reason?: string;
  transactionId?: string;
  fee?: number;
  paymentSystem?: string;
  createdDate?: number;
  processingDate?: number;
};

export type WayForPayWebhookAcknowledge = {
  orderReference: string;
  status: 'accept';
  time: number;
  signature: string;
};

export type PaymentProviderPayload = WayForPayWebhookPayload;
