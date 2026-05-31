import { Comment } from '@prisma/client';
import {
  CommentListItem,
  CreateCommentInput,
  NormalizedCommentsQuery,
  PaginatedResult,
  RetryFailedCommentsInput,
  RetryFailedCommentsResult,
  UpdateCommentInput,
} from '../types';

export interface ICommentsService {
  create(postId: number, authorId: string, data: CreateCommentInput): Promise<{ message: string }>;
  getCommentsByPostId(postId: number, query: NormalizedCommentsQuery): Promise<PaginatedResult<CommentListItem>>;
  update(id: number, data: UpdateCommentInput): Promise<{ message: string }>;
  delete(id: number): Promise<{ message: string }>;
  deleteByModerator(ids: number[]): Promise<{ message: string }>;
  toggleLike(commentId: number, userId: string): Promise<{ message: string; liked: boolean }>;
  retryFailedModerationByAdmin(params: RetryFailedCommentsInput, adminId: string): Promise<RetryFailedCommentsResult>;
}
