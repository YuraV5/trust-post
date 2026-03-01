import { Injectable } from '@nestjs/common';
import { PostsRepo } from '../repos';
import { MessageResponse } from '../../../common/types';
import { CreatePost, StaffPostUpdate, PostLifecycleStatus } from '../types';
import { Post } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-errors';
import { hasUpdatableFields } from '../../../common/utils';
import { IPostsService } from '../interfaces';

@Injectable()
export class PostsService implements IPostsService {
  constructor(private readonly postsRepo: PostsRepo) {}

  async create(authorId: string, data: CreatePost): Promise<MessageResponse> {
    await this.postsRepo.create(authorId, data);
    return { message: 'Post created successfully' };
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return await this.postsRepo.findByAuthorId(userId);
  }

  async getAllPosts(): Promise<Post[]> {
    return await this.postsRepo.findMany();
  }

  async findById(id: number): Promise<Post> {
    const post = await this.postsRepo.findById(id);
    if (!post) {
      throw new NotFoundError('Post not found');
    }
    return post;
  }

  async update(postId: number, authorId: string, data: StaffPostUpdate): Promise<MessageResponse> {
    if (!hasUpdatableFields(data)) {
      throw new BadRequestError('At least one field must be provided for update');
    }
    await this.postsRepo.update([postId], data);
    return { message: 'Post updated successfully' };
  }

  async delete(postId: number, authorId: string): Promise<MessageResponse> {
    const result = await this.postsRepo.delete([postId]);
    if (result.count === 0) {
      throw new NotFoundError('Post not found');
    }
    return { message: 'Post deleted successfully' };
  }

  async updatePostStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<MessageResponse> {
    if (!hasUpdatableFields(data)) {
      throw new BadRequestError('At least one field must be provided for update');
    }
    await this.postsRepo.updateStatus(postId, reviewerId, data);
    return { message: 'Post status updated successfully' };
  }
}
