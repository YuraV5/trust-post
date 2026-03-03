import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PostsLikeRepo {
  constructor(private readonly db: PrismaService) {}

  async createLike(postId: number, userId: string): Promise<boolean> {
    await this.db.$transaction(async (tx) => {
      await tx.postLike.create({
        data: {
          postId,
          userId,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          totalLikes: {
            increment: 1,
          },
        },
      });
    });

    return true;
  }

  async deleteLike(postId: number, userId: string): Promise<boolean> {
    await this.db.$transaction(async (tx) => {
      await tx.postLike.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          totalLikes: {
            decrement: 1,
          },
        },
      });
    });

    return true;
  }

  async getLikeByUserPost(postId: number, userId: string): Promise<{ id: number } | null> {
    const like = await this.db.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
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
