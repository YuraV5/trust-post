import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IPostsReviewRepo } from '../interfaces';
import { PostReview } from '@prisma/client';
import { PostId, PostReviewStatusUpdate } from '../types';

@Injectable()
export class PostsReviewRepo implements IPostsReviewRepo {
  constructor(private readonly db: PrismaService) {}

  async create(postId: number, reviewedById: string): Promise<PostId> {
    const postReview = await this.db.postReview.create({
      data: {
        postId,
        reviewedById,
      },
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

  async updateStatus(postId: number, data: PostReviewStatusUpdate): Promise<void> {
    const { reviewStatus, reviewReason } = data;
    await this.db.postReview.update({
      where: { id: postId },
      data: {
        status: reviewStatus,
        reviewReason,
      },
    });
  }
}
