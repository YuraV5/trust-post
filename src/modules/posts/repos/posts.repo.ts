import { Injectable } from '@nestjs/common';
import { IPostsRepo } from '../interfaces';
import { Post, PostReviewStatus, PostStatus, Prisma } from '@prisma/client';
import {
  CreatePost,
  PaginatedResult,
  PostCount,
  PublicPostDetails,
  PublicPostWithMainImage,
  StaffModerationPost,
  StaffPostUpdate,
  PostStatusUpdate,
} from '../types';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';

type PostLikeViewerRow = {
  userId: string;
};

type PostWithMainImageRow = Post & {
  files: Array<{ url: string }>;
  likes?: PostLikeViewerRow[];
};

type PostDetailsRow = Post & {
  author: {
    id: string;
    name: string;
    photoUrl: string | null;
    isEmailVerified: boolean;
  } | null;
  likes?: PostLikeViewerRow[];
};

function resolveStaffReviewStatus(postStatus?: PostStatus): PostReviewStatus {
  if (postStatus === PostStatus.BLOCKED || postStatus === PostStatus.REJECTED) {
    return PostReviewStatus.REJECTED;
  }

  return PostReviewStatus.PENDING;
}

@Injectable()
export class PostsRepo implements IPostsRepo {
  constructor(private readonly db: PrismaService) {}

  private mapPostsWithMainImage(rows: PostWithMainImageRow[], viewerId?: string): PublicPostWithMainImage[] {
    return rows.map(({ files, likes, ...post }) => ({
      ...post,
      mainImageUrl: files[0]?.url ?? null,
      lastPostReviewAt: null,
      likedByMe: viewerId ? (likes?.length ?? 0) > 0 : false,
    }));
  }

  private mapUserPostsWithMainImage(
    rows: Array<
      Prisma.PostGetPayload<{
        include: {
          files: {
            where: { mainImage: true };
            select: { url: true };
            take: 1;
            orderBy: { createdAt: 'asc' };
          };
          postReviews: {
            select: { createdAt: true };
            orderBy: { createdAt: 'desc' };
            take: 1;
          };
        };
      }>
    >,
  ): PublicPostWithMainImage[] {
    return rows.map(({ files, postReviews, ...post }) => ({
      ...post,
      mainImageUrl: files[0]?.url ?? null,
      lastPostReviewAt: postReviews[0]?.createdAt ?? null,
    }));
  }

  private mapStaffPostsWithMainImage(
    rows: Array<
      Prisma.PostGetPayload<{
        include: {
          files: {
            where: { mainImage: true };
            select: { url: true };
            take: 1;
            orderBy: { createdAt: 'asc' };
          };
          author: {
            select: {
              id: true;
              name: true;
              email: true;
              photoUrl: true;
            };
          };
          postReviews: {
            where: {
              isActive: true;
            };
            orderBy: {
              createdAt: 'desc';
            };
            take: 1;
            include: {
              reviewedBy: {
                select: {
                  id: true;
                  name: true;
                  email: true;
                  photoUrl: true;
                };
              };
            };
          };
        };
      }>
    >,
  ): StaffModerationPost[] {
    return rows.map(({ files, postReviews, ...post }) => ({
      ...post,
      postReviews,
      mainImageUrl: files[0]?.url ?? null,
      lastPostReviewAt: postReviews[0]?.createdAt ?? null,
    }));
  }

  async create(authorId: string, inp: CreatePost): Promise<Post> {
    return await this.db.post.create({
      data: {
        title: inp.title,
        content: inp.content,
        targetAmount: inp.targetAmount,
        targetDate: inp.targetDate,
        status: inp.isDraft === false ? PostStatus.PENDING_REVIEW : PostStatus.DRAFT,
        authorId: authorId,
        referencePaymentId: `ref_${randomUUID()}`,
      },
    });
  }

  async getPostById(id: number, viewerId?: string, tx?: Prisma.TransactionClient): Promise<PublicPostDetails | null> {
    const client = tx ?? this.db;
    const post = (await client.post.findUnique({
      where: {
        id,
        status: PostStatus.APPROVED,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            isEmailVerified: true,
          },
        },
        ...(viewerId
          ? {
              likes: {
                where: { userId: viewerId },
                select: { userId: true },
                take: 1,
              },
            }
          : {}),
      },
    })) as PostDetailsRow | null;

    if (!post) {
      return null;
    }

    const { likes, ...rest } = post;
    return {
      ...rest,
      likedByMe: viewerId ? (likes?.length ?? 0) > 0 : false,
    };
  }

  async getPostLikeSummary(id: number): Promise<{ id: number; totalLikes: number } | null> {
    return await this.db.post.findFirst({
      where: {
        id,
        status: PostStatus.APPROVED,
      },
      select: {
        id: true,
        totalLikes: true,
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

  async findByAuthorIdPaginated(
    authorId: string,
    query: NormalizedUserQuery,
  ): Promise<PaginatedResult<PublicPostWithMainImage>> {
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

    const [rawData, total] = await Promise.all([
      this.db.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          files: {
            where: { mainImage: true },
            select: { url: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
          postReviews: {
            select: {
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      }),
      this.db.post.count({ where }),
    ]);

    const data = this.mapUserPostsWithMainImage(rawData);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findManyPublic(
    query: NormalizedPublicQuery,
    viewerId?: string,
  ): Promise<PaginatedResult<PublicPostWithMainImage>> {
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

    const dataPromise = this.db.post.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        files: {
          where: { mainImage: true },
          select: { url: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        ...(viewerId
          ? {
              likes: {
                where: { userId: viewerId },
                select: { userId: true },
                take: 1,
              },
            }
          : {}),
      },
    }) as unknown as Promise<PostWithMainImageRow[]>;
    const totalPromise = this.db.post.count({ where });
    const [rawData, total] = await Promise.all([dataPromise, totalPromise]);

    const data = this.mapPostsWithMainImage(rawData, viewerId);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findManyStaff(query: NormalizedStaffQuery): Promise<PaginatedResult<StaffModerationPost>> {
    const { page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const reviewStatus = resolveStaffReviewStatus(query.status);

    // Build where clause with optional filters
    const where: Prisma.PostWhereInput = {
      postReviews: {
        some: {
          isActive: true,
          status: reviewStatus,
        },
      },
    };

    // Add optional filters
    if (query.authorId) {
      where.authorId = query.authorId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.reviewerId) {
      where.postReviews = {
        some: {
          isActive: true,
          status: reviewStatus,
          reviewedById: query.reviewerId,
        },
      };
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

    const [rawData, total] = await Promise.all([
      this.db.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          files: {
            where: { mainImage: true },
            select: { url: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
          postReviews: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            include: {
              reviewedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      }),
      this.db.post.count({ where }),
    ]);

    const data = this.mapStaffPostsWithMainImage(rawData);

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
