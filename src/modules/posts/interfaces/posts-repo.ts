import { Post, Prisma } from '@prisma/client';
import {
  CreatePost,
  PaginatedResult,
  PostCount,
  PostId,
  PublicPostWithMainImage,
  PublicPostDetails,
  StaffModerationPost,
  StaffPostUpdate,
  PostStatusUpdate,
  NormalizedUserQuery,
  NormalizedPublicQuery,
  NormalizedStaffQuery,
} from '../types';

export interface IPostsRepo {
  create(authorId: string, inp: CreatePost): Promise<PostId>;
  getPostById(id: number): Promise<PublicPostDetails | null>;
  getPostLikeSummary(id: number): Promise<{ id: number; totalLikes: number } | null>;
  getPostByIdForAuthor(id: number, authorId: string): Promise<Post | null>;
  findByAuthorId(authorId: string): Promise<Post[]>;
  findByAuthorIdPaginated(
    authorId: string,
    query: NormalizedUserQuery,
  ): Promise<PaginatedResult<PublicPostWithMainImage>>;
  findManyPublic(query: NormalizedPublicQuery): Promise<PaginatedResult<PublicPostWithMainImage>>;
  findManyStaff(query: NormalizedStaffQuery): Promise<PaginatedResult<StaffModerationPost>>;
  update(ids: number[], data: StaffPostUpdate): Promise<PostCount>;
  delete(ids: number[], statusReason?: string): Promise<PostCount>;
  deleteByAdmin(ids: number[], tx?: Prisma.TransactionClient): Promise<PostCount>;
  updateStatus(postId: number, data: PostStatusUpdate, tx?: Prisma.TransactionClient): Promise<Post>;
}
