import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PostsLikeRepo {
  constructor(private readonly db: PrismaService) {}

  async createLike(postId: number, userId: string): Promise<boolean> {
    try {
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
    } catch (error) {
      // If the like already exists, we can ignore the error and return true
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return true;
      }
      throw error;
    }

    return true;
  }

  async deleteLike(postId: number, userId: string): Promise<boolean> {
    try {
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
    } catch (error) {
      // If the like doesn't exist, we can ignore the error and return true
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return true;
      }
      throw error;
    }

    return true;
  }

  async getLikeByUserPost(postId: number, userId: string): Promise<{ postId: number; userId: string } | null> {
    const like = await this.db.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      select: {
        postId: true,
        userId: true,
      },
    });

    return like;
  }
}
