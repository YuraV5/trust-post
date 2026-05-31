import { Comment } from '@prisma/client';

export type CreateCommentInput = {
  postId: number;
  content: string;
};

export type UpdateCommentInput = {
  content: string;
};

export type CommentId = Pick<Comment, 'id'>;

export type CommentListItem = Comment & {
  likedByMe: boolean;
  author: {
    name: string;
  };
};

export type LikeResult = {
  liked: boolean; // true if liked, false if unliked
};

export type DeleteResult = {
  count: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type NormalizedCommentsQuery = {
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type ApproveCommentModerationInput = {
  provider: string;
  score: number;
};

export type RejectCommentModerationInput = {
  provider: string;
  score: number;
  reason: string;
};

export type RetryFailedCommentsInput = {
  postId?: number;
  authorId?: string;
  limit?: number;
};

export type RetryFailedCommentCandidate = {
  id: number;
  postId: number;
  content: string;
};

export type RetryFailedCommentsResult = {
  queuedCount: number;
};
