import { Injectable } from '@nestjs/common';
import { IPostsRepo } from '../interfaces';
import { Post, PostStatus, Prisma } from '@prisma/client';
import { CreatePost, PaginatedResult, PostCount, PostId, StaffPostUpdate, PostLifecycleStatus } from '../types';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';

@Injectable()
export class PostsRepo implements IPostsRepo {
  constructor(private readonly db: PrismaService) {}

  async create(authorId: string, inp: CreatePost): Promise<PostId> {
    return await this.db.post.create({
      data: {
        title: inp.title,
        content: inp.content,
        targetAmount: inp.targetAmount,
        targetDate: inp.targetDate,
        authorId: authorId,
        referencePaymentId: `ref_${randomUUID()}`,
      },
      select: {
        id: true,
      },
    });
  }

  async findById(id: number): Promise<Post | null> {
    return await this.db.post.findUnique({
      where: {
        id,
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
      },
    });
    return { count: result.count };
  }

  async delete(ids: number[]): Promise<PostCount> {
    const result = await this.db.post.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return { count: result.count };
  }

  async updateStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<Post> {
    const reuslt = await this.db.$transaction([
      this.db.post.update({
        where: {
          id: postId,
        },
        data: {
          status: data.postStatus,
          statusReason: data.statusReason,
        },
      }),
      this.db.postReview.create({
        data: {
          postId,
          reviewedById: reviewerId,
          status: data.reviewStatus,
          reviewReason: data.reviewReason,
        },
      }),
    ]);

    return reuslt[0];
  }
}
