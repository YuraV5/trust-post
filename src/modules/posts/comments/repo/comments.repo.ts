import { Injectable } from '@nestjs/common';
import { Comment, Prisma, CommentStatus, ModeratorType } from '@prisma/client';
import {
  ApproveCommentModerationInput,
  CreateCommentInput,
  UpdateCommentInput,
  PaginatedResult,
  NormalizedCommentsQuery,
  DeleteResult,
  RejectCommentModerationInput,
} from '../types';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICommentsRepo } from '../interfaces';

@Injectable()
export class CommentsRepo implements ICommentsRepo {
  constructor(private readonly db: PrismaService) {}

  async create(authorId: string, data: CreateCommentInput): Promise<Comment> {
    return await this.db.comment.create({
      data: {
        postId: data.postId,
        authorId,
        content: data.content,
      },
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
      const existing = await tx.comment.findUnique({
        where: { id },
        select: {
          id: true,
          postId: true,
          status: true,
          moderatorType: true,
          moderationReason: true,
          moderatedAt: true,
        },
      });

      if (!existing) {
        return null;
      }

      const shouldDecrement = this.isCountedComment(existing);

      const comment = await tx.comment.update({
        where: { id },
        data: {
          status: CommentStatus.DELETED,
        },
        include: {
          author: true,
        },
      });

      if (shouldDecrement) {
        await tx.post.update({
          where: { id: comment.postId },
          data: {
            totalComments: {
              decrement: 1,
            },
          },
        });
      }

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
          id: true,
          postId: true,
          status: true,
          moderatorType: true,
          moderationReason: true,
          moderatedAt: true,
        },
      });

      // Групуємо по postId і рахуємо кількість
      const postCounts = comments.reduce(
        (acc, comment) => {
          if (!this.isCountedComment(comment)) {
            return acc;
          }

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

  async markModeratedApproved(id: number, data: ApproveCommentModerationInput): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id },
        select: {
          id: true,
          postId: true,
          status: true,
          moderatorType: true,
          moderationReason: true,
          moderatedAt: true,
        },
      });

      if (!comment || comment.status !== CommentStatus.VISIBLE) {
        return;
      }

      const alreadyCounted = this.isCountedComment(comment);

      await tx.comment.update({
        where: { id },
        data: {
          moderationProvider: data.provider,
          moderationScore: data.score,
          moderationReason: null,
          moderatedAt: new Date(),
          moderatorType: ModeratorType.AGENT,
        },
      });

      if (!alreadyCounted) {
        await tx.post.update({
          where: { id: comment.postId },
          data: {
            totalComments: {
              increment: 1,
            },
          },
        });
      }
    });
  }

  async markModeratedRejected(id: number, data: RejectCommentModerationInput): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id },
        select: {
          id: true,
          postId: true,
          status: true,
          moderatorType: true,
          moderationReason: true,
          moderatedAt: true,
        },
      });

      if (!comment) {
        return;
      }

      const alreadyCounted = this.isCountedComment(comment);

      await tx.comment.update({
        where: { id },
        data: {
          status: CommentStatus.REJECTED,
          moderationProvider: data.provider,
          moderationScore: data.score,
          moderationReason: data.reason,
          moderatedAt: new Date(),
          moderatorType: ModeratorType.AGENT,
        },
      });

      if (alreadyCounted) {
        await tx.post.update({
          where: { id: comment.postId },
          data: {
            totalComments: {
              decrement: 1,
            },
          },
        });
      }
    });
  }

  async markModerationServiceUnavailable(id: number, reason: string): Promise<void> {
    await this.db.comment.updateMany({
      where: { id },
      data: {
        moderationProvider: 'local',
        moderationReason: reason,
        moderatorType: ModeratorType.LOCAL,
        moderatedAt: new Date(),
      },
    });
  }

  // Checks if the comment should be counted in totalComments based on its moderation status
  private isCountedComment(comment: {
    status: CommentStatus;
    moderatorType: ModeratorType | null;
    moderationReason: string | null;
    moderatedAt: Date | null;
  }): boolean {
    return (
      comment.status === CommentStatus.VISIBLE &&
      comment.moderatorType === ModeratorType.AGENT &&
      comment.moderatedAt !== null &&
      comment.moderationReason === null
    );
  }
}
