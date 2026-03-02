import { Post, PostStatus, PrismaClient } from '@prisma/client';
import {
  CreatePost,
  PaginatedResult,
  PostCount,
  PostId,
  StaffPostUpdate,
  PostStatusUpdate,
  NormalizedUserQuery,
  NormalizedPublicQuery,
  NormalizedStaffQuery,
} from '../types';

export interface IPostsRepo {
  create(authorId: string, inp: CreatePost): Promise<PostId>;
  getPostById(id: number, status: PostStatus): Promise<Post | null>;
  findByAuthorId(authorId: string): Promise<Post[]>;
  findByAuthorIdPaginated(authorId: string, query: NormalizedUserQuery): Promise<PaginatedResult<Post>>;
  findManyPublic(query: NormalizedPublicQuery): Promise<PaginatedResult<Post>>;
  findManyStaff(query: NormalizedStaffQuery): Promise<PaginatedResult<Post>>;
  update(ids: number[], data: StaffPostUpdate): Promise<PostCount>;
  delete(ids: number[]): Promise<PostCount>;
  updateStatus(postId: number, data: PostStatusUpdate, tx?: PrismaClient): Promise<Post>;
}
