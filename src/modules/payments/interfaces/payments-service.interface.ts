import { PaymentProvider } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces';
import {
  CreateAnonymousPaymentDto,
  CreateUserPaymentDto,
  PaymentsQueryDto,
  RegeneratePaymentLinkDto,
  WayForPayWebhookDto,
} from '../dtos';
import { PaymentInitResponse, PaymentsPage, WayForPayWebhookAcknowledge } from '../types';

export interface IPaymentsService {
  createAnonymousPayment(dto: CreateAnonymousPaymentDto): Promise<PaymentInitResponse>;
  createUserPayment(user: AuthenticatedUser, dto: CreateUserPaymentDto): Promise<PaymentInitResponse>;
  regeneratePaymentLink(userId: string, paymentId: string, dto: RegeneratePaymentLinkDto): Promise<PaymentInitResponse>;
  handleWebhook(provider: PaymentProvider, payload: WayForPayWebhookDto): Promise<WayForPayWebhookAcknowledge>;
  listMyPayments(userId: string, query: PaymentsQueryDto): Promise<PaymentsPage>;
}
