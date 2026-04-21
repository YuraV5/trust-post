import { PostStatus } from '@prisma/client';

export type SortBy = 'createdAt' | 'targetDate' | 'targetAmount' | 'currentAmount';
export type SortOrder = 'asc' | 'desc';

export type NormalizedPublicQuery = {
  page: number;
  limit: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  createdAt?: string;
  targetDate?: string;
  targetAmount?: number;
  currentAmount?: number;
  search?: string;
};

export type NormalizedStaffQuery = NormalizedPublicQuery & {
  authorId?: string;
  status?: PostStatus;
};

export type NormalizedUserQuery = {
  page: number;
  limit: number;
  status?: PostStatus;
  sortBy: SortBy;
  sortOrder: SortOrder;
};
