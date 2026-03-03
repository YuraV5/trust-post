import { Injectable } from '@nestjs/common';
import { Comment, Prisma, CommentStatus } from '@prisma/client';
import {
  CreateCommentInput,
  UpdateCommentInput,
  PaginatedResult,
  NormalizedCommentsQuery,
  DeleteResult,
} from '../types';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICommentsRepo } from '../interfaces';

@Injectable()
export class CommentsRepo implements ICommentsRepo {
  constructor(private readonly db: PrismaService) {}

  async create(authorId: string, data: CreateCommentInput): Promise<Comment> {
    return await this.db.$transaction(async (tx) => {
      const resp = await tx.comment.create({
        data: {
          postId: data.postId,
          authorId,
          content: data.content,
        },
      });
      await tx.post.update({
        where: { id: data.postId },
        data: {
          totalComments: {
            increment: 1,
          },
        },
      });
      return resp;
    });
  }

  async getById(id: number): Promise<Comment | null> {
    return await this.db.comment.findUnique({
      where: { id },
      include: {
        author: true,
      },
    });
  }

  async findByPostIdPaginated(postId: number, query: NormalizedCommentsQuery): Promise<PaginatedResult<Comment>> {
    const { page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CommentWhereInput = {
      postId,
      status: CommentStatus.VISIBLE,
    };

    const orderBy: Prisma.CommentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.db.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.db.comment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: number, data: UpdateCommentInput): Promise<Comment | null> {
    return await this.db.comment.update({
      where: { id },
      data: {
        content: data.content,
      },
      include: {
        author: true,
      },
    });
  }

  async delete(id: number): Promise<Comment | null> {
    return await this.db.$transaction(async (tx) => {
      const comment = await tx.comment.update({
        where: { id },
        data: {
          status: CommentStatus.DELETED,
        },
        include: {
          author: true,
        },
      });

      await tx.post.update({
        where: { id: comment.postId },
        data: {
          totalComments: {
            decrement: 1,
          },
        },
      });

      return comment;
    });
  }

  async hardDeleteMany(ids: number[]): Promise<DeleteResult> {
    return await this.db.$transaction(async (tx) => {
      // Спочатку отримуємо postId для кожного коментаря
      const comments = await tx.comment.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        select: {
          postId: true,
        },
      });

      // Групуємо по postId і рахуємо кількість
      const postCounts = comments.reduce(
        (acc, comment) => {
          acc[comment.postId] = (acc[comment.postId] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      );

      // Видаляємо коментарі
      const result = await tx.comment.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      // Декрементуємо totalComments для кожного поста
      await Promise.all(
        Object.entries(postCounts).map(([postId, count]) =>
          tx.post.update({
            where: { id: Number(postId) },
            data: {
              totalComments: {
                decrement: count,
              },
            },
          }),
        ),
      );

      return {
        count: result.count,
      };
    });
  }
}
