import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IPostsReviewRepo } from '../interfaces';
import { PostReview, PostReviewStatus, Prisma } from '@prisma/client';
import { PostId, PostReviewStatusUpdate } from '../types/common';

@Injectable()
export class PostsReviewRepo implements IPostsReviewRepo {
  constructor(private readonly db: PrismaService) {}

  async assignReviewer(postId: number, reviewedById: string, tx?: Prisma.TransactionClient): Promise<PostId> {
    const postReview = await (tx ?? this.db).postReview.create({
      data: {
        postId,
        reviewedById,
        status: PostReviewStatus.PENDING,
      },
    });
    return { id: postReview.id };
  }

  async addPostReview(
    postId: number,
    reviewedById: string,
    data: PostReviewStatusUpdate,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: number }> {
    const postReview = await (tx ?? this.db).postReview.create({
      data: {
        postId,
        reviewedById,
        status: data.reviewStatus,
        reviewReason: data.reviewReason,
      },
      select: { id: true },
    });
    return { id: postReview.id };
  }

  async findById(id: number): Promise<PostReview | null> {
    return await this.db.postReview.findUnique({
      where: { id },
    });
  }

  async findByPostId(postId: number): Promise<PostReview[]> {
    return await this.db.postReview.findMany({
      where: { postId },
    });
  }

  async findActivePendingByPost(postId: number): Promise<PostReview | null> {
    return await this.db.postReview.findFirst({
      where: {
        postId,
        isActive: true,
        status: PostReviewStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findActivePendingByPostAndReviewer(postId: number, reviewerId: string): Promise<PostReview | null> {
    return await this.db.postReview.findFirst({
      where: {
        postId,
        reviewedById: reviewerId,
        isActive: true,
        status: PostReviewStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async suspendPreviousReview(postId: number, tx?: Prisma.TransactionClient): Promise<{ count: number }> {
    const result = await (tx ?? this.db).postReview.updateMany({
      where: {
        postId,
      },
      data: { isActive: false },
    });

    return { count: result.count };
  }

  async updateStatus(postId: number, data: PostReviewStatusUpdate, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.db).postReview.update({
      where: { id: postId },
      data: {
        status: data.reviewStatus,
        reviewReason: data.reviewReason,
      },
    });
  }

  async deleteHistoryByAdmin(postId: number, tx?: Prisma.TransactionClient): Promise<{ count: number }> {
    const result = await (tx ?? this.db).postReview.deleteMany({
      where: { postId },
    });
    return { count: result.count };
  }
}
