import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';

export type PaymentAttemptPreview = {
  id: string;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  status: PaymentStatus;
  statusReason: string | null;
  createdAt: Date;
};

export type PaymentListItem = {
  id: string;
  postId: number;
  userId: string | null;
  isAnonymous: boolean;
  amount: Prisma.Decimal;
  currency: string;
  status: PaymentStatus;
  statusReason: string | null;
  referencePaymentId: string;
  lastAttemptId: string | null;
  confirmedAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  post: {
    id: number;
    title: string;
  };
  lastAttempt: PaymentAttemptPreview | null;
};

export type PaymentsListQuery = {
  page: number;
  limit: number;
  status?: PaymentStatus;
  postId?: number;
};

export type PaymentsPage = {
  data: PaymentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
