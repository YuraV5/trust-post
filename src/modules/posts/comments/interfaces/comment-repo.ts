import { Comment } from '@prisma/client';
import {
  CreateCommentInput,
  NormalizedCommentsQuery,
  PaginatedResult,
  UpdateCommentInput,
  DeleteResult,
} from '../types';

export interface ICommentsRepo {
  create(authorId: string, data: CreateCommentInput): Promise<Comment>;
  getById(id: number): Promise<Comment | null>;
  findByPostIdPaginated(postId: number, query: NormalizedCommentsQuery): Promise<PaginatedResult<Comment>>;
  update(id: number, data: UpdateCommentInput): Promise<Comment | null>;
  delete(id: number): Promise<Comment | null>;
  hardDeleteMany(ids: number[]): Promise<DeleteResult>;
}
