import { PostReviewStatus, PostStatus } from '@prisma/client';

export type CreatePost = {
  title: string;
  content: string;
  targetAmount: number;
  targetDate: Date;
  isDraft?: boolean;
};

export type UpdatePost = {
  title?: string;
  content?: string;
};

export type StaffPostUpdate = UpdatePost & {
  targetAmount?: number;
  targetDate?: Date;
};

export type PostStatusUpdate = {
  postStatus: PostStatus;
  statusReason?: string | null;
};

export type PostReviewStatusUpdate = {
  reviewStatus: PostReviewStatus;
  reviewReason?: string;
};

export type PostLifecycleStatus = PostStatusUpdate & PostReviewStatusUpdate;

export type PostCount = {
  count: number;
};

export type PostId = {
  id: number;
};

export type EditUserPostStatus = {
  status: 'ARCHIVED' | 'COMPLETED';
  statusReason: string;
};

export type AssignReviewerJobData = {
  postId: number;
};
