import { PostReviewStatus, PostStatus, Prisma } from '@prisma/client';

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

export type StaffModerationPost = Prisma.PostGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        email: true;
        photoUrl: true;
      };
    };
    postReviews: {
      where: {
        isActive: true;
      };
      orderBy: {
        createdAt: 'desc';
      };
      take: 1;
      include: {
        reviewedBy: {
          select: {
            id: true;
            name: true;
            email: true;
            photoUrl: true;
          };
        };
      };
    };
  };
}>;

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
