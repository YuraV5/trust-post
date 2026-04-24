import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from '../../src/modules/posts/comments/services/comments.service';
import { CommentsRepo, CommentLikeRepo } from '../../src/modules/posts/comments/repo';
import { TokensService } from '../../src/modules/security/services';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { StubAppLogger } from '../__mock__';
import { CommentsCacheService } from '../../src/modules/posts/comments/services/comments-cache.service';
import { CommentsModerationRetryHandler } from '../../src/modules/posts/comments/services/comments-moderation-retry.handler';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentsRepo = {
    create: jest.fn(),
    setModerationProcessing: jest.fn(),
    markModerationServiceUnavailable: jest.fn(),
    findByPostIdPaginated: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hardDeleteMany: jest.fn(),
    findFailedForRetry: jest.fn(),
    setModerationProcessingIfFailed: jest.fn(),
  };

  const mockCommentLikeRepo = {
    getLikeByUserComment: jest.fn(),
    deleteLike: jest.fn(),
    createLike: jest.fn(),
  };

  const mockModerationRetryHandler = {
    enqueueOrThrow: jest.fn(),
  };

  const mockCommentsCacheService = {
    getByPostQuery: jest.fn(),
    setByPostQuery: jest.fn(),
  };

  const mockTokensService = {
    verifyAccess: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCommentsCacheService.getByPostQuery.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepo, useValue: mockCommentsRepo },
        { provide: CommentLikeRepo, useValue: mockCommentLikeRepo },
        { provide: CommentsModerationRetryHandler, useValue: mockModerationRetryHandler },
        { provide: CommentsCacheService, useValue: mockCommentsCacheService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a comment, enqueues moderation, and marks it processing', async () => {
      mockCommentsRepo.create.mockResolvedValue({
        id: 21,
        postId: 5,
        content: 'First comment',
      });
      mockModerationRetryHandler.enqueueOrThrow.mockResolvedValue(undefined);

      const result = await service.create(5, 'user-1', { content: 'First comment' });

      expect(result).toEqual({ message: 'Comment created successfully' });
      expect(mockCommentsRepo.create).toHaveBeenCalledWith('user-1', {
        postId: 5,
        content: 'First comment',
      });
      expect(mockModerationRetryHandler.enqueueOrThrow).toHaveBeenCalledWith({
        id: 21,
        postId: 5,
        content: 'First comment',
      }, {
        action: 'create',
        setProcessing: true,
      });
      expect(StubAppLogger.info).toHaveBeenCalledWith('Comment created by user user-1 on post 5', { commentId: 21 });
    });

    it('throws when moderation enqueue fails during creation', async () => {
      mockCommentsRepo.create.mockResolvedValue({
        id: 22,
        postId: 5,
        content: 'Queued later',
      });
      mockModerationRetryHandler.enqueueOrThrow.mockRejectedValue(new Error('queue down'));

      await expect(service.create(5, 'user-2', { content: 'Queued later' })).rejects.toThrow('queue down');
    });
  });

  describe('getCommentsByPostId', () => {
    it('normalizes pagination and forwards viewer id to repo', async () => {
      mockCommentsRepo.findByPostIdPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });

      await service.getCommentsByPostId(
        7,
        {
          page: -1,
          limit: 500,
          sortBy: 'invalid' as never,
          sortOrder: 'asc',
        },
        'viewer-1',
      );

      expect(mockCommentsRepo.findByPostIdPaginated).toHaveBeenCalledWith(
        7,
        {
          page: 1,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        },
        'viewer-1',
      );
    });
  });

  describe('update', () => {
    it('throws when content is empty after trimming', async () => {
      await expect(service.update(1, { content: '   ' })).rejects.toThrow('Content cannot be empty');
    });

    it('throws when comment does not exist', async () => {
      mockCommentsRepo.getById.mockResolvedValue(null);

      await expect(service.update(2, { content: 'Updated comment' })).rejects.toThrow('Comment not found');
    });

    it('updates a comment and re-enqueues moderation', async () => {
      mockCommentsRepo.getById.mockResolvedValue({ id: 9, postId: 4, content: 'Old comment' });
      mockCommentsRepo.update.mockResolvedValue({ id: 9, postId: 4, content: 'Updated comment' });
      mockModerationRetryHandler.enqueueOrThrow.mockResolvedValue(undefined);

      const result = await service.update(9, { content: 'Updated comment' });

      expect(result).toEqual({ message: 'Comment updated successfully' });
      expect(mockCommentsRepo.update).toHaveBeenCalledWith(9, { content: 'Updated comment' });
      expect(mockModerationRetryHandler.enqueueOrThrow).toHaveBeenCalledWith({
        id: 9,
        postId: 4,
        content: 'Updated comment',
      }, {
        action: 'update',
        setProcessing: true,
      });
      expect(StubAppLogger.info).toHaveBeenCalledWith('Comment 9 updated');
    });

    it('throws when moderation enqueue fails during update', async () => {
      mockCommentsRepo.getById.mockResolvedValue({ id: 10, postId: 3, content: 'Before' });
      mockCommentsRepo.update.mockResolvedValue({ id: 10, postId: 3, content: 'After' });
      mockModerationRetryHandler.enqueueOrThrow.mockRejectedValue(new Error('queue offline'));

      await expect(service.update(10, { content: 'After' })).rejects.toThrow('queue offline');
    });
  });

  describe('delete', () => {
    it('throws when comment does not exist', async () => {
      mockCommentsRepo.getById.mockResolvedValue(null);

      await expect(service.delete(30)).rejects.toThrow('Comment not found');
    });

    it('deletes comment and logs action', async () => {
      mockCommentsRepo.getById.mockResolvedValue({ id: 31 });
      mockCommentsRepo.delete.mockResolvedValue(undefined);

      const result = await service.delete(31);

      expect(result).toEqual({ message: 'Comment deleted successfully' });
      expect(mockCommentsRepo.delete).toHaveBeenCalledWith(31);
      expect(StubAppLogger.info).toHaveBeenCalledWith('Comment 31 deleted');
    });
  });

  describe('deleteByModerator', () => {
    it('throws when no ids are provided', async () => {
      await expect(service.deleteByModerator([])).rejects.toThrow('At least one comment ID must be provided');
    });

    it('throws when repo deletes nothing', async () => {
      mockCommentsRepo.hardDeleteMany.mockResolvedValue({ count: 0 });

      await expect(service.deleteByModerator([1, 2])).rejects.toThrow('No comments were deleted');
    });

    it('returns success message with deleted count', async () => {
      mockCommentsRepo.hardDeleteMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteByModerator([4, 5]);

      expect(result).toEqual({ message: '2 comment(s) deleted successfully' });
      expect(StubAppLogger.info).toHaveBeenCalledWith('2 comment(s) permanently deleted by moderator', {
        deletedIds: [4, 5],
      });
    });
  });

  describe('retryFailedModerationByAdmin', () => {
    it('retries only comments successfully moved back to processing', async () => {
      mockCommentsRepo.findFailedForRetry.mockResolvedValue([
        { id: 1, postId: 10, content: 'A' },
        { id: 2, postId: 10, content: 'B' },
      ]);
      mockCommentsRepo.setModerationProcessingIfFailed.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockModerationRetryHandler.enqueueOrThrow.mockResolvedValue(undefined);

      const result = await service.retryFailedModerationByAdmin({ postId: 10, limit: 500 }, 'admin-1');

      expect(result).toEqual({ queuedCount: 1 });
      expect(mockCommentsRepo.findFailedForRetry).toHaveBeenCalledWith({
        postId: 10,
        authorId: undefined,
        limit: 100,
      });
      expect(mockCommentsRepo.setModerationProcessingIfFailed).toHaveBeenNthCalledWith(1, 1);
      expect(mockCommentsRepo.setModerationProcessingIfFailed).toHaveBeenNthCalledWith(2, 2);
      expect(mockModerationRetryHandler.enqueueOrThrow).toHaveBeenCalledTimes(1);
      expect(mockModerationRetryHandler.enqueueOrThrow).toHaveBeenCalledWith({
        id: 1,
        postId: 10,
        content: 'A',
      }, {
        action: 'retry',
        adminId: 'admin-1',
        setProcessing: false,
      });
      expect(StubAppLogger.info).toHaveBeenCalledWith(
        'Admin started retry for failed comments moderation',
        expect.objectContaining({
          adminId: 'admin-1',
          queuedCount: 1,
          requestedLimit: 500,
          appliedLimit: 100,
          filters: {
            postId: 10,
            authorId: undefined,
          },
        }),
      );
    });

    it('fails retry operation when queue is unavailable', async () => {
      mockCommentsRepo.findFailedForRetry.mockResolvedValue([{ id: 3, postId: 12, content: 'Retry me' }]);
      mockCommentsRepo.setModerationProcessingIfFailed.mockResolvedValue(true);
      mockModerationRetryHandler.enqueueOrThrow.mockRejectedValue(new Error('retry queue failed'));

      await expect(service.retryFailedModerationByAdmin({ authorId: 'user-9', limit: 5 }, 'admin-2')).rejects.toThrow(
        'retry queue failed',
      );
    });
  });

  describe('toggleLike', () => {
    it('removes an existing like', async () => {
      mockCommentLikeRepo.getLikeByUserComment.mockResolvedValue({ commentId: 5, userId: 'user-1' });
      mockCommentLikeRepo.deleteLike.mockResolvedValue(true);

      const result = await service.toggleLike(5, 'user-1');

      expect(result).toEqual({ message: 'Like removed', liked: false });
      expect(mockCommentLikeRepo.deleteLike).toHaveBeenCalledWith(5, 'user-1');
      expect(mockCommentLikeRepo.createLike).not.toHaveBeenCalled();
    });

    it('adds a like when none exists', async () => {
      mockCommentLikeRepo.getLikeByUserComment.mockResolvedValue(null);
      mockCommentLikeRepo.createLike.mockResolvedValue(true);

      const result = await service.toggleLike(6, 'user-2');

      expect(result).toEqual({ message: 'Like added', liked: true });
      expect(mockCommentLikeRepo.createLike).toHaveBeenCalledWith(6, 'user-2');
      expect(mockCommentLikeRepo.deleteLike).not.toHaveBeenCalled();
    });
  });

  describe('resolveViewerId', () => {
    it('returns undefined when authorization header is missing or invalid', async () => {
      await expect(service.resolveViewerId(undefined)).resolves.toBeUndefined();
      await expect(service.resolveViewerId('Basic token')).resolves.toBeUndefined();
      expect(mockTokensService.verifyAccess).not.toHaveBeenCalled();
    });

    it('returns subject from access token payload', async () => {
      mockTokensService.verifyAccess.mockResolvedValue({ sub: 'viewer-42' });

      await expect(service.resolveViewerId('Bearer access-token')).resolves.toBe('viewer-42');
      expect(mockTokensService.verifyAccess).toHaveBeenCalledWith('access-token');
    });

    it('returns undefined when token verification fails', async () => {
      mockTokensService.verifyAccess.mockRejectedValue(new Error('invalid token'));

      await expect(service.resolveViewerId('Bearer broken-token')).resolves.toBeUndefined();
    });
  });
});