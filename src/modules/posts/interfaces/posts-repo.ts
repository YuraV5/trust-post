import { Post, PostStatus } from '@prisma/client';
import { CreatePost, PostCount, PostId, StaffPostUpdate, PostLifecycleStatus } from '../types';

export interface IPostsRepo {
  create(authorId: string, inp: CreatePost): Promise<PostId>;
  findById(id: number, status: PostStatus): Promise<Post | null>;
  findByAuthorId(authorId: string): Promise<Post[]>;
  findMany(): Promise<Post[]>;
  update(ids: number[], data: StaffPostUpdate): Promise<PostCount>;
  delete(ids: number[]): Promise<PostCount>;
  updateStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<Post>;
}
