import { Post, PostStatus } from '@prisma/client';
import { CreatePost, PaginatedResult, PostCount, PostId, StaffPostUpdate, PostLifecycleStatus } from '../types';
import { NormalizedPublicQuery, NormalizedStaffQuery, NormalizedUserQuery } from '../types';

export interface IPostsRepo {
  create(authorId: string, inp: CreatePost): Promise<PostId>;
  findById(id: number, status: PostStatus): Promise<Post | null>;
  findByAuthorId(authorId: string): Promise<Post[]>;
  findByAuthorIdPaginated(authorId: string, query: NormalizedUserQuery): Promise<PaginatedResult<Post>>;
  findManyPublic(query: NormalizedPublicQuery): Promise<PaginatedResult<Post>>;
  findManyStaff(query: NormalizedStaffQuery): Promise<PaginatedResult<Post>>;
  update(ids: number[], data: StaffPostUpdate): Promise<PostCount>;
  delete(ids: number[]): Promise<PostCount>;
  updateStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<Post>;
}
