import { Injectable } from '@nestjs/common';
import { IPostsRepo } from '../interfaces';
import { Post } from '@prisma/client';
import { CreatePost, PostCount, PostId, StaffPostUpdate, PostLifecycleStatus } from '../types';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

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

  async findMany(): Promise<Post[]> {
    return await this.db.post.findMany();
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
