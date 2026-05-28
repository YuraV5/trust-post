import { Post, PostReviewStatus, PostStatus } from '@prisma/client';

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

export type StaffModeratorSummary = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
};

export type StaffPostReviewSummary = {
  id: number;
  postId: number;
  reviewedById: string;
  status: PostReviewStatus;
  isActive: boolean;
  reviewReason: string | null;
  createdAt: Date;
  reviewedBy: StaffModeratorSummary | null;
};

export type StaffModerationPost = Post & {
  author: StaffModeratorSummary | null;
  postReviews: StaffPostReviewSummary[];
};

export type PublicPostWithMainImage = Post & {
  mainImageUrl: string | null;
};

export type StaffModerationHistoryPost = {
  id: number;
  title: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type StaffModerationHistoryEvent = {
  reviewId: number;
  reviewStatus: PostReviewStatus;
  postStatus: PostStatus;
  reason: string | null;
  changedAt: Date;
  moderator: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type StaffModerationHistory = {
  post: StaffModerationHistoryPost;
  history: StaffModerationHistoryEvent[];
};
