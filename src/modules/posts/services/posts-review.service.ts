import { PostReviewStatus, PostStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/services';
import { PostsRepo } from '../repos';
import { PostsReviewRepo } from './../repos/posts-review.repo';
import { Inject, Injectable } from '@nestjs/common';
import { AppBadRequestException, AppForbiddenException, AppNotFoundException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { PostLifecycleStatus, StaffModerationHistory } from '../types/common';
import { ResponseMessage } from '../../../common/types';
import { EmailQueueService } from '../../emails/email-queue.service';
import { MetricsService } from '../../../infrastructure/metrics/metrics.service';
import { AuthenticatedUser } from '../../../common/interfaces';
import { UserRoles } from '@prisma/client';
import { PostsCacheService } from './posts-cache.service';

@Injectable()
export class PostsReviewService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly postsReviewRepo: PostsReviewRepo,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly postsRepo: PostsRepo,
    private readonly emailQueue: EmailQueueService,
    private readonly metricsService: MetricsService,
    private readonly postsCacheService: PostsCacheService,
  ) {}

  async assignReviewer(postId: number): Promise<ResponseMessage> {
    const reviewer = await this.usersService.fetchAllModerators();
    if (reviewer.length === 0) {
      throw new AppNotFoundException('No reviewers available');
    }
    const randomIndex = Math.floor(Math.random() * reviewer.length);
    const reviewerId = reviewer[randomIndex].id;

    try {
      const result = await this.prisma.transaction(async (tx) => {
        await this.postsReviewRepo.suspendPreviousReview(postId, tx);
        await this.postsReviewRepo.assignReviewer(postId, reviewerId, tx);
        await this.postsRepo.updateStatus(postId, { postStatus: PostStatus.PENDING_REVIEW }, tx);
        return true;
      });
      this.logger.debug(`Assigned reviewer ${reviewerId} to post ${postId}`, { result });
    } catch (error) {
      this.logger.error(`Failed to assign reviewer to post ${postId}: ${(error as Error).message}`);
      throw error;
    }

    this.logger.debug(`Reviewer assigned to post ${postId} by user ${reviewerId}`);
    return { message: 'Reviewer assigned successfully' };
  }

  async modifyPostReviewStatus(
    postId: number,
    currentUser: AuthenticatedUser,
    data: PostLifecycleStatus,
  ): Promise<ResponseMessage> {
    const reviewerId = currentUser.userId;
    const { reviewStatus, reviewReason, postStatus, statusReason } = data;
    const resolvedReviewReason = reviewReason ?? statusReason ?? undefined;

    // --- VALIDATION ---
    if (this.allowedPostStatus(postStatus) && !statusReason) {
      throw new AppBadRequestException('statusReason is required when postStatus is REJECTED or BLOCKED');
    }

    if (reviewStatus === PostReviewStatus.REJECTED) {
      if (!this.allowedPostStatus(postStatus)) {
        throw new AppBadRequestException('When reviewStatus is REJECTED, postStatus must be REJECTED or BLOCKED');
      }

      if (!resolvedReviewReason) {
        throw new AppBadRequestException('Review reason is required for rejected reviews');
      }
    }

    // Approved moderation must always map to approved post lifecycle status.
    if (reviewStatus === PostReviewStatus.APPROVED && postStatus !== PostStatus.APPROVED) {
      throw new AppBadRequestException('When reviewStatus is APPROVED, postStatus must be APPROVED');
    }

    // --- LOAD REQUIRED DATA ONCE ---
    const activeReview = await this.postsReviewRepo.findLatestActiveByPost(postId);
    if (!activeReview) {
      throw new AppForbiddenException('You are not assigned to moderate this post or post is not in active moderation');
    }

    if (currentUser.role !== UserRoles.ADMIN && activeReview.reviewedById !== reviewerId) {
      throw new AppForbiddenException('You are not assigned to moderate this post or post is not in active moderation');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new AppNotFoundException('Post not found');
    }
    const user = await this.usersService.getUserById(post.authorId);
    if (!user) {
      throw new AppNotFoundException('User not found');
    }

    const finalStatusReason =
      reviewStatus === PostReviewStatus.APPROVED ? null : (statusReason ?? resolvedReviewReason ?? null);

    // --- TRANSACTION ---
    await this.prisma.$transaction(async (tx) => {
      await this.postsReviewRepo.suspendPreviousReview(postId, tx);

      await this.postsReviewRepo.addPostReview(
        postId,
        reviewerId,
        { reviewStatus, reviewReason: resolvedReviewReason },
        tx,
      );

      await this.postsRepo.updateStatus(postId, { postStatus, statusReason: finalStatusReason }, tx);
    });

    await this.postsCacheService.invalidatePostMutationCache([postId]);

    // Count publication only when moderation approves the post.
    if (
      reviewStatus === PostReviewStatus.APPROVED &&
      postStatus === PostStatus.APPROVED &&
      post.status !== PostStatus.APPROVED
    ) {
      this.metricsService.recordPostCreated('published');
    }

    if (reviewStatus === PostReviewStatus.REJECTED) {
      this.emailQueue
        .enqueuePostRejectedEmail(user.email, {
          postTitle: post.title,
          reason: resolvedReviewReason!,
        })
        .catch((error) => {
          this.logger.error('Failed to enqueue post rejected email job', {
            postId,
            userId: user.id,
            error: error as Error,
          });
        });
    }

    this.logger.debug(
      `Post ${postId} review status updated to ${reviewStatus} and post status updated to ${postStatus} by reviewer ${reviewerId}`,
    );

    return { message: 'Post review and lifecycle status updated successfully' };
  }
  async getPostStatusHistory(postId: number): Promise<StaffModerationHistory> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true,
        statusReason: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        postReviews: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            reviewedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new AppNotFoundException('Post not found');
    }

    const history = post.postReviews.map((review, index) => {
      const isLatestReview = index === 0;
      const postStatus =
        review.status === PostReviewStatus.PENDING
          ? PostStatus.PENDING_REVIEW
          : review.status === PostReviewStatus.APPROVED
            ? PostStatus.APPROVED
            : isLatestReview && (post.status === PostStatus.BLOCKED || post.status === PostStatus.REJECTED)
              ? post.status
              : PostStatus.REJECTED;
      const reason =
        review.status === PostReviewStatus.APPROVED
          ? null
          : (review.reviewReason ?? (isLatestReview ? (post.statusReason ?? null) : null));

      return {
        reviewId: review.id,
        reviewStatus: review.status,
        postStatus,
        reason,
        changedAt: review.createdAt,
        moderator: review.reviewedBy
          ? {
              id: review.reviewedBy.id,
              name: review.reviewedBy.name,
              email: review.reviewedBy.email,
            }
          : null,
      };
    });

    return {
      post: {
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
        author: post.author
          ? {
              id: post.author.id,
              name: post.author.name,
              email: post.author.email,
            }
          : null,
      },
      history,
    };
  }

  async purgePostReviewDataByAdmin(postIds: number[], adminId: string): Promise<ResponseMessage> {
    const resultCounts = await this.prisma.transaction(async (tx) => {
      const counts: number[] = [];

      for (const postId of postIds) {
        // Delete post review history for the post
        await this.postsReviewRepo.deleteHistoryByAdmin(postId, tx);

        // Delete the post itself
        const result = await this.postsRepo.deleteByAdmin([postId], tx);
        counts.push(result.count);
      }

      return counts;
    });

    const totalDeleted = resultCounts.reduce((sum, c) => sum + c, 0);
    this.logger.info(`Admin ${adminId} deleted post review history for posts: ${postIds.join(', ')}`, {
      resultCounts,
      totalDeleted,
    });

    return { message: 'Post review history and posts archived successfully' };
  }

  private allowedPostStatus(postStatus: PostStatus): boolean {
    const allowedStatuses = new Set<PostStatus>([PostStatus.REJECTED, PostStatus.BLOCKED]);
    return allowedStatuses.has(postStatus);
  }
}
