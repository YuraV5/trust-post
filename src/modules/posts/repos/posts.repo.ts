import { Injectable } from '@nestjs/common';
import { IPostsRepo } from '../interfaces';
import { Post, PostStatus, Prisma } from '@prisma/client';
import { CreatePost, PaginatedResult, PostCount, StaffPostUpdate, PostStatusUpdate } from '../types';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';

@Injectable()
export class PostsRepo implements IPostsRepo {
  constructor(private readonly db: PrismaService) {}

  async create(authorId: string, inp: CreatePost): Promise<Post> {
    return await this.db.post.create({
      data: {
        title: inp.title,
        content: inp.content,
        targetAmount: inp.targetAmount,
        targetDate: inp.targetDate,
        authorId: authorId,
        referencePaymentId: `ref_${randomUUID()}`,
      },
    });
  }

  async getPostById(id: number, tx?: Prisma.TransactionClient): Promise<Post | null> {
    const client = tx ?? this.db;
    return await client.post.findUnique({
      where: {
        id,
        status: PostStatus.APPROVED,
      },
    });
  }

  async getPostByIdForAuthor(id: number, authorId: string): Promise<Post | null> {
    return await this.db.post.findFirst({
      where: {
        id,
        authorId,
      },
    });
  }

  async findByAuthorId(authorId: string): Promise<Post[]> {
    return await this.db.post.findMany({
      where: {
        authorId,
      },
    });
  }

  async findByAuthorIdPaginated(authorId: string, query: NormalizedUserQuery): Promise<PaginatedResult<Post>> {
    const { page, limit, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PostWhereInput = {
      authorId,
    };

    // Add optional status filter
    if (status) {
      where.status = status;
    }

    // Build orderBy
    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.db.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.db.post.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findManyPublic(query: NormalizedPublicQuery): Promise<PaginatedResult<Post>> {
    const { page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause with status filter and optional filters
    const where: Prisma.PostWhereInput = {
      status: PostStatus.APPROVED,
    };

    // Add optional filters
    if (query.createdAt) {
      where.createdAt = new Date(query.createdAt);
    }
    if (query.targetDate) {
      where.targetDate = new Date(query.targetDate);
    }
    if (query.targetAmount !== undefined) {
      where.targetAmount = new Prisma.Decimal(String(query.targetAmount));
    }
    if (query.currentAmount !== undefined) {
      where.currentAmount = new Prisma.Decimal(String(query.currentAmount));
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.db.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.db.post.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findManyStaff(query: NormalizedStaffQuery): Promise<PaginatedResult<Post>> {
    const { page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause with optional filters
    const where: Prisma.PostWhereInput = {};

    // Add optional filters
    if (query.authorId) {
      where.authorId = query.authorId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.createdAt) {
      where.createdAt = new Date(query.createdAt);
    }
    if (query.targetDate) {
      where.targetDate = new Date(query.targetDate);
    }
    if (query.targetAmount !== undefined) {
      where.targetAmount = new Prisma.Decimal(String(query.targetAmount));
    }
    if (query.currentAmount !== undefined) {
      where.currentAmount = new Prisma.Decimal(String(query.currentAmount));
    }

    // Build orderBy
    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.db.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.db.post.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(ids: number[], data: StaffPostUpdate): Promise<PostCount> {
    const result = await this.db.post.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        ...data,
        status: PostStatus.PENDING_REVIEW, // Set status to PENDING_REVIEW on any update
      },
    });
    return { count: result.count };
  }

  async delete(ids: number[], statusReason?: string): Promise<PostCount> {
    const result = await this.db.post.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status: PostStatus.ARCHIVED, // Set status to ARCHIVED on delete
        deletedAt: new Date(), // Set deletedAt timestamp
        statusReason: statusReason ?? 'Post marked to delete', // Use provided reason for archival
      },
    });
    return { count: result.count };
  }

  async deleteByAdmin(ids: number[], tx?: Prisma.TransactionClient): Promise<PostCount> {
    const result = await (tx ?? this.db).post.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return { count: result.count };
  }

  async updateStatus(postId: number, data: PostStatusUpdate, tx?: Prisma.TransactionClient): Promise<Post> {
    return await (tx ?? this.db).post.update({
      where: { id: postId },
      data: {
        status: data.postStatus,
        statusReason: data.statusReason,
      },
    });
  }
}
