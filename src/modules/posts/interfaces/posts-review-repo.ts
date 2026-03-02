import { PostReview, Prisma } from '@prisma/client';
import { PostId, PostReviewStatusUpdate } from '../types/common';

export interface IPostsReviewRepo {
  assignReviewer(postId: number, reviewedById: string, tx?: Prisma.TransactionClient): Promise<PostId>;
  addPostReview(
    postId: number,
    reviewedById: string,
    data: PostReviewStatusUpdate,
    tx?: Prisma.TransactionClient,
  ): Promise<PostId>;
  findById(id: number): Promise<PostReview | null>;
  findByPostId(postId: number): Promise<PostReview[]>;
  suspendPreviousReview(postId: number, tx?: Prisma.TransactionClient): Promise<{ count: number }>;
  updateStatus(postId: number, data: PostReviewStatusUpdate, tx?: Prisma.TransactionClient): Promise<void>;
  deleteHistoryByAdmin(postId: number, tx?: Prisma.TransactionClient): Promise<{ count: number }>;
}
