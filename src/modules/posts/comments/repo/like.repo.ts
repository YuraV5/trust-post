import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ILikeRepo } from '../interfaces/like-repo';

@Injectable()
export class LikeRepo implements ILikeRepo {
  constructor(private readonly db: PrismaService) {}

  async createLike(commentId: number, userId: string): Promise<boolean> {
    await this.db.$transaction(async (tx) => {
      await tx.commentLike.create({
        data: {
          commentId,
          userId,
        },
      });
      await tx.comment.update({
        where: { id: commentId },
        data: {
          totalLikes: {
            increment: 1,
          },
        },
      });
    });

    return true;
  }

  async deleteLike(commentId: number, userId: string): Promise<boolean> {
    await this.db.$transaction(async (tx) => {
      await tx.commentLike.delete({
        where: {
          commentId_userId: {
            commentId,
            userId,
          },
        },
      });
      await tx.comment.update({
        where: { id: commentId },
        data: {
          totalLikes: {
            decrement: 1,
          },
        },
      });
    });

    return true;
  }

  async getLikeByUserComment(commentId: number, userId: string): Promise<{ id: number } | null> {
    const like = await this.db.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    return like;
  }
}
