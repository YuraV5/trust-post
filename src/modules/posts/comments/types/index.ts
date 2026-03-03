import { Comment } from '@prisma/client';

export type CreateCommentInput = {
  postId: number;
  content: string;
};

export type UpdateCommentInput = {
  content: string;
};

export type CommentId = Pick<Comment, 'id'>;

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
