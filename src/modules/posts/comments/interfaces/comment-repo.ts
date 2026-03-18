import { Comment } from '@prisma/client';
import {
  CreateCommentInput,
  ApproveCommentModerationInput,
  NormalizedCommentsQuery,
  PaginatedResult,
  RejectCommentModerationInput,
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
  markModeratedApproved(id: number, data: ApproveCommentModerationInput): Promise<void>;
  markModeratedRejected(id: number, data: RejectCommentModerationInput): Promise<void>;
  markModerationServiceUnavailable(id: number, reason: string): Promise<void>;
}
