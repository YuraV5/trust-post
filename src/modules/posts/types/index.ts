import { PostStatus, VersionStatus } from '@prisma/client';

export type CreatePost = {
  title: string;
  content: string;
  targetAmount: number;
  targetDate: Date;
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
  statusReason?: string;
};

export type PostReviewStatusUpdate = {
  reviewStatus: VersionStatus;
  reviewReason?: string;
};

export type PostLifecycleStatus = PostStatusUpdate & PostReviewStatusUpdate;

export type PostCount = {
  count: number;
};

export type PostId = {
  id: number;
};
