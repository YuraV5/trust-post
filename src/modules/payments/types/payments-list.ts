import { Payment, PaymentStatus } from '@prisma/client';

export type PaymentsListQuery = {
  page: number;
  limit: number;
  status?: PaymentStatus;
  postId?: number;
};

export type PaymentsPage = {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
