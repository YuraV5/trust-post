import { PostsReviewService } from '../../src/modules/posts/services/posts-review.service';
import { PostReviewStatus, PostStatus, UserRoles } from '@prisma/client';
import { StubAppLogger } from '../__mock__';

const flushAsyncTasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('PostsReviewService', () => {
  const postsReviewRepoMock = {
    suspendPreviousReview: jest.fn(),
    assignReviewer: jest.fn(),
    addPostReview: jest.fn(),
    findByPostId: jest.fn(),
    findLatestActiveByPost: jest.fn(),
    deleteHistoryByAdmin: jest.fn(),
  };

  const usersServiceMock = {
    fetchAllModerators: jest.fn(),
    getUserById: jest.fn(),
  };

  const txMock = {
    ...postsReviewRepoMock,
  };

  const prismaMock = {
    transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) => cb(txMock)),
    $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) => cb(txMock)),
    post: {
      findUnique: jest.fn(),
    },
  };

  const postsRepoMock = {
    getPostById: jest.fn(),
    updateStatus: jest.fn(),
    deleteByAdmin: jest.fn(),
  };

  const emailQueueMock = {
    enqueuePostRejectedEmail: jest.fn(),
  };

  const metricsServiceMock = {
    recordPostCreated: jest.fn(),
  };

  const postsCacheServiceMock = {
    invalidatePostMutationCache: jest.fn(),
  };

  let service: PostsReviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    prismaMock.$transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    prismaMock.post.findUnique.mockResolvedValue({
      id: 1,
      title: 'My Post',
      createdAt: new Date('2026-05-28T10:00:00.000Z'),
      status: PostStatus.PENDING_REVIEW,
      statusReason: null,
      author: {
        id: 'u1',
        name: 'Author',
        email: 'author@test.com',
      },
      postReviews: [],
    });
    postsReviewRepoMock.findLatestActiveByPost.mockResolvedValue({ reviewedById: 'reviewer-1' });
    emailQueueMock.enqueuePostRejectedEmail.mockResolvedValue(undefined);
    postsCacheServiceMock.invalidatePostMutationCache.mockResolvedValue(undefined);
    service = new PostsReviewService(
      StubAppLogger,
      postsReviewRepoMock as any,
      usersServiceMock as any,
      prismaMock as any,
      postsRepoMock as any,
      emailQueueMock as any,
      metricsServiceMock as any,
      postsCacheServiceMock as any,
    );
  });

  describe('assignReviewer', () => {
    it('throws when no reviewers available', async () => {
      usersServiceMock.fetchAllModerators.mockResolvedValue([]);

      await expect(service.assignReviewer(1)).rejects.toThrow('No reviewers available');
    });

    it('assigns a reviewer and updates post status to PENDING_REVIEW', async () => {
      usersServiceMock.fetchAllModerators.mockResolvedValue([{ id: 'mod-1' }]);
      postsReviewRepoMock.suspendPreviousReview.mockResolvedValue(undefined);
      postsReviewRepoMock.assignReviewer.mockResolvedValue(undefined);
      postsRepoMock.updateStatus.mockResolvedValue(undefined);

      const result = await service.assignReviewer(10);

      expect(postsReviewRepoMock.assignReviewer).toHaveBeenCalledWith(10, 'mod-1', expect.anything());
      expect(postsRepoMock.updateStatus).toHaveBeenCalledWith(
        10,
        { postStatus: PostStatus.PENDING_REVIEW },
        expect.anything(),
      );
      expect(result).toEqual({ message: 'Reviewer assigned successfully' });
    });

    it('rethrows transaction errors', async () => {
      usersServiceMock.fetchAllModerators.mockResolvedValue([{ id: 'mod-1' }]);
      prismaMock.transaction.mockRejectedValue(new Error('transaction failed'));

      await expect(service.assignReviewer(1)).rejects.toThrow('transaction failed');
    });
  });

  describe('modifyPostReviewStatus', () => {
    const currentReviewer = { userId: 'reviewer-1', role: UserRoles.MODERATOR };

    const buildData = (overrides = {}) => ({
      reviewStatus: PostReviewStatus.APPROVED,
      postStatus: PostStatus.APPROVED,
      reviewReason: null,
      statusReason: null,
      ...overrides,
    });

    it('throws when REJECTED status maps to non-allowed post status', async () => {
      await expect(
        service.modifyPostReviewStatus(1, currentReviewer, {
          reviewStatus: PostReviewStatus.REJECTED,
          postStatus: PostStatus.APPROVED, // not allowed
          reviewReason: 'spam',
          statusReason: null,
        }),
      ).rejects.toThrow('When reviewStatus is REJECTED, postStatus must be REJECTED or BLOCKED');
    });

    it('throws when REJECTED has no statusReason', async () => {
      await expect(
        service.modifyPostReviewStatus(1, currentReviewer, {
          reviewStatus: PostReviewStatus.REJECTED,
          postStatus: PostStatus.REJECTED,
          reviewReason: null,
          statusReason: null,
        }),
      ).rejects.toThrow('statusReason is required when postStatus is REJECTED or BLOCKED');
    });

    it('throws when APPROVED maps to non-APPROVED post status', async () => {
      await expect(
        service.modifyPostReviewStatus(1, currentReviewer, {
          reviewStatus: PostReviewStatus.APPROVED,
          postStatus: PostStatus.PENDING_REVIEW,
          reviewReason: null,
          statusReason: null,
        }),
      ).rejects.toThrow('When reviewStatus is APPROVED, postStatus must be APPROVED');
    });

    it('throws when post not found', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce(null);

      await expect(service.modifyPostReviewStatus(99, currentReviewer, buildData())).rejects.toThrow('Post not found');
    });

    it('throws when author not found', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        authorId: 'u1',
        title: 'Post',
        status: PostStatus.PENDING_REVIEW,
      });
      usersServiceMock.getUserById.mockResolvedValue(null);

      await expect(service.modifyPostReviewStatus(1, currentReviewer, buildData())).rejects.toThrow('User not found');
    });

    it('approves post and records publication metric when post was not previously approved', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        authorId: 'u1',
        title: 'My Post',
        status: PostStatus.PENDING_REVIEW,
      });
      usersServiceMock.getUserById.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
      postsReviewRepoMock.suspendPreviousReview.mockResolvedValue(undefined);
      postsReviewRepoMock.addPostReview.mockResolvedValue(undefined);
      postsRepoMock.updateStatus.mockResolvedValue(undefined);

      const result = await service.modifyPostReviewStatus(1, currentReviewer, buildData());

      expect(postsCacheServiceMock.invalidatePostMutationCache).toHaveBeenCalledWith([1]);
      expect(metricsServiceMock.recordPostCreated).toHaveBeenCalledWith('published');
      expect(result).toEqual({ message: 'Post review and lifecycle status updated successfully' });
    });

    it('does not record publication metric when post was already approved', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        authorId: 'u1',
        title: 'My Post',
        status: PostStatus.APPROVED,
      });
      usersServiceMock.getUserById.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
      postsReviewRepoMock.suspendPreviousReview.mockResolvedValue(undefined);
      postsReviewRepoMock.addPostReview.mockResolvedValue(undefined);
      postsRepoMock.updateStatus.mockResolvedValue(undefined);

      await service.modifyPostReviewStatus(1, currentReviewer, buildData());

      expect(metricsServiceMock.recordPostCreated).not.toHaveBeenCalled();
    });

    it('enqueues rejection email when post is rejected', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        authorId: 'u1',
        title: 'My Post',
        status: PostStatus.PENDING_REVIEW,
      });
      usersServiceMock.getUserById.mockResolvedValue({ id: 'u1', email: 'author@test.com' });
      postsReviewRepoMock.suspendPreviousReview.mockResolvedValue(undefined);
      postsReviewRepoMock.addPostReview.mockResolvedValue(undefined);
      postsRepoMock.updateStatus.mockResolvedValue(undefined);

      await service.modifyPostReviewStatus(1, currentReviewer, {
        reviewStatus: PostReviewStatus.REJECTED,
        postStatus: PostStatus.REJECTED,
        reviewReason: 'Contains spam',
        statusReason: 'Contains spam',
      });
      await flushAsyncTasks();

      expect(emailQueueMock.enqueuePostRejectedEmail).toHaveBeenCalledWith('author@test.com', {
        postTitle: 'My Post',
        reason: 'Contains spam',
      });
    });

    it('logs error when rejection email enqueue fails without rethrowing', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        authorId: 'u1',
        title: 'My Post',
        status: PostStatus.PENDING_REVIEW,
      });
      usersServiceMock.getUserById.mockResolvedValue({ id: 'u1', email: 'author@test.com' });
      postsReviewRepoMock.suspendPreviousReview.mockResolvedValue(undefined);
      postsReviewRepoMock.addPostReview.mockResolvedValue(undefined);
      postsRepoMock.updateStatus.mockResolvedValue(undefined);
      emailQueueMock.enqueuePostRejectedEmail.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.modifyPostReviewStatus(1, currentReviewer, {
        reviewStatus: PostReviewStatus.REJECTED,
        postStatus: PostStatus.REJECTED,
        reviewReason: 'Spam',
        statusReason: 'Spam',
      });
      await flushAsyncTasks();

      expect(result).toEqual({ message: 'Post review and lifecycle status updated successfully' });
      expect(StubAppLogger.error).toHaveBeenCalled();
    });
  });

  describe('getPostStatusHistory', () => {
    it('returns empty history when no reviews exist', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'My Post',
        createdAt: new Date('2026-05-28T10:00:00.000Z'),
        status: PostStatus.PENDING_REVIEW,
        statusReason: null,
        author: {
          id: 'u1',
          name: 'Author',
          email: 'author@test.com',
        },
        postReviews: [],
      });

      await expect(service.getPostStatusHistory(1)).resolves.toEqual({
        post: {
          id: 1,
          title: 'My Post',
          createdAt: new Date('2026-05-28T10:00:00.000Z'),
          author: {
            id: 'u1',
            name: 'Author',
            email: 'author@test.com',
          },
        },
        history: [],
      });
    });

    it('throws when post not found', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce(null);

      await expect(service.getPostStatusHistory(1)).rejects.toThrow('Post not found');
    });

    it('returns history when found', async () => {
      prismaMock.post.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'My Post',
        createdAt: new Date('2026-05-28T10:00:00.000Z'),
        status: PostStatus.APPROVED,
        statusReason: null,
        author: {
          id: 'u1',
          name: 'Author',
          email: 'author@test.com',
        },
        postReviews: [
          {
            id: 1,
            createdAt: new Date('2026-05-28T11:00:00.000Z'),
            status: PostReviewStatus.APPROVED,
            reviewReason: null,
            reviewedBy: {
              id: 'reviewer-1',
              name: 'Moderator',
              email: 'mod@test.com',
            },
          },
        ],
      });

      const result = await service.getPostStatusHistory(1);

      expect(result).toEqual({
        post: {
          id: 1,
          title: 'My Post',
          createdAt: new Date('2026-05-28T10:00:00.000Z'),
          author: {
            id: 'u1',
            name: 'Author',
            email: 'author@test.com',
          },
        },
        history: [
          {
            reviewId: 1,
            reviewStatus: PostReviewStatus.APPROVED,
            postStatus: PostStatus.APPROVED,
            reason: null,
            changedAt: new Date('2026-05-28T11:00:00.000Z'),
            moderator: {
              id: 'reviewer-1',
              name: 'Moderator',
              email: 'mod@test.com',
            },
          },
        ],
      });
    });
  });

  describe('purgePostReviewDataByAdmin', () => {
    it('deletes review history and posts in a transaction and returns success message', async () => {
      postsReviewRepoMock.deleteHistoryByAdmin.mockResolvedValue(undefined);
      postsRepoMock.deleteByAdmin.mockResolvedValue({ count: 1 });

      const result = await service.purgePostReviewDataByAdmin([1, 2], 'admin-1');

      expect(postsReviewRepoMock.deleteHistoryByAdmin).toHaveBeenCalledTimes(2);
      expect(postsRepoMock.deleteByAdmin).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Post review history and posts archived successfully' });
    });
  });
});
