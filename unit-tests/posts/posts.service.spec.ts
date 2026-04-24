import { Test, TestingModule } from '@nestjs/testing';
import { PostStatus } from '@prisma/client';
import { PostsService } from '../../src/modules/posts/services/posts.service';
import { StubAppLogger } from '../__mock__';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { PostsLikeRepo, PostsRepo } from '../../src/modules/posts/repos';
import { PostsQueueService } from '../../src/modules/posts/queue';
import { PostsCacheService } from '../../src/modules/posts/services';
import { QueueRetryHandlerService } from '../../src/modules/queues/services';
import { mockPostsRepo, mockPostsLikeRepo, mockPostsQueueService, mockPostsCacheService, mockQueueRetryHandler } from './__mock__';

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueueRetryHandler.runOrThrow.mockImplementation((action: () => Promise<void>) => action());
    mockPostsCacheService.getUserPosts.mockResolvedValue(null);
    mockPostsCacheService.getPublicPosts.mockResolvedValue(null);
    mockPostsCacheService.getStaffPosts.mockResolvedValue(null);
    mockPostsCacheService.getPostById.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PostsRepo, useValue: mockPostsRepo },
        { provide: PostsLikeRepo, useValue: mockPostsLikeRepo },
        { provide: PostsQueueService, useValue: mockPostsQueueService },
        { provide: PostsCacheService, useValue: mockPostsCacheService },
        { provide: QueueRetryHandlerService, useValue: mockQueueRetryHandler },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a post and enqueues reviewer assignment', async () => {
      const createdPost = { id: 7, title: 'Help rebuild the shelter' };
      mockPostsRepo.create.mockResolvedValue(createdPost);
      mockPostsQueueService.assignReviewerToPost.mockResolvedValue(undefined);

      const result = await service.create('user-1', {
        title: 'Help rebuild the shelter',
        content: 'A'.repeat(60),
        targetAmount: 5000,
        targetDate: '2026-05-01',
      } as never);

      expect(result).toEqual(createdPost);
      expect(mockPostsRepo.create).toHaveBeenCalledWith('user-1', expect.any(Object));
      expect(mockPostsQueueService.assignReviewerToPost).toHaveBeenCalledWith(7);
    });

    it('throws when queue assignment fails after retries', async () => {
      const createdPost = { id: 11, title: 'Emergency fund' };
      mockPostsRepo.create.mockResolvedValue(createdPost);
      mockQueueRetryHandler.runOrThrow.mockRejectedValue(new Error('queue unavailable'));

      await expect(
        service.create('user-2', {
          title: 'Emergency fund',
          content: 'B'.repeat(60),
        } as never),
      ).rejects.toThrow('queue unavailable');
    });
  });

  describe('getUserPosts', () => {
    it('normalizes pagination and forwards filters to repo', async () => {
      mockPostsRepo.findByAuthorIdPaginated.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await service.getUserPosts('user-1', {
        page: -3,
        limit: 500,
        status: PostStatus.PENDING_REVIEW,
        sortBy: 'invalid' as never,
        sortOrder: 'asc',
      });

      expect(mockPostsRepo.findByAuthorIdPaginated).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 100,
        status: PostStatus.PENDING_REVIEW,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
    });
  });

  describe('getAllPublicPosts', () => {
    it('normalizes sort field and pagination bounds', async () => {
      mockPostsRepo.findManyPublic.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await service.getAllPublicPosts({
        page: 0,
        limit: 0,
        createdAt: '2026-01-01',
        targetAmount: 1500,
        sortBy: 'invalid' as never,
      });

      expect(mockPostsRepo.findManyPublic).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        createdAt: '2026-01-01',
        targetDate: undefined,
        targetAmount: 1500,
        currentAmount: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });

  describe('getAllStaffPosts', () => {
    it('passes normalized moderation query to repo', async () => {
      mockPostsRepo.findManyStaff.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await service.getAllStaffPosts({
        page: 3,
        limit: 200,
        authorId: 'author-1',
        status: PostStatus.APPROVED,
        sortBy: 'targetAmount',
        sortOrder: 'asc',
      });

      expect(mockPostsRepo.findManyStaff).toHaveBeenCalledWith({
        page: 3,
        limit: 100,
        createdAt: undefined,
        targetDate: undefined,
        targetAmount: undefined,
        currentAmount: undefined,
        authorId: 'author-1',
        status: PostStatus.APPROVED,
        sortBy: 'targetAmount',
        sortOrder: 'asc',
      });
    });
  });

  describe('findById', () => {
    it('returns post when found', async () => {
      const post = { id: 5, title: 'Existing post' };
      mockPostsRepo.getPostById.mockResolvedValue(post);

      await expect(service.findById(5)).resolves.toEqual(post);
      expect(mockPostsCacheService.setPostById).toHaveBeenCalledWith(5, post);
    });

    it('throws when post does not exist', async () => {
      mockPostsRepo.getPostById.mockResolvedValue(null);

      await expect(service.findById(404)).rejects.toThrow('No posts found');
    });
  });

  describe('update', () => {
    it('throws when no updatable fields are provided', async () => {
      await expect(service.update([1], { title: '', content: undefined })).rejects.toThrow(
        'At least one field must be provided for update',
      );
    });

    it('updates posts and enqueues reviewer assignment for each post', async () => {
      mockPostsRepo.update.mockResolvedValue({ count: 2 });
      mockPostsQueueService.assignReviewerToPost.mockResolvedValue(undefined);

      const result = await service.update([1, 2], { title: 'Updated title' });

      expect(result).toEqual({ message: 'Post updated successfully' });
      expect(mockPostsRepo.update).toHaveBeenCalledWith([1, 2], { title: 'Updated title' });
      expect(mockPostsQueueService.assignReviewerToPost).toHaveBeenNthCalledWith(1, 1);
      expect(mockPostsQueueService.assignReviewerToPost).toHaveBeenNthCalledWith(2, 2);
    });

    it('fails update when queue assignment fails after retries', async () => {
      mockPostsRepo.update.mockResolvedValue({ count: 2 });
      mockQueueRetryHandler.runOrThrow
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('queue unavailable'));

      await expect(service.update([1, 2], { content: 'C'.repeat(80) })).rejects.toThrow('queue unavailable');
    });

    it('throws when repo did not update any posts', async () => {
      mockPostsRepo.update.mockResolvedValue({ count: 0 });

      await expect(service.update([88], { title: 'Updated title' })).rejects.toThrow('No posts were updated');
    });
  });

  describe('delete', () => {
    it('returns success message when posts are deleted', async () => {
      mockPostsRepo.delete.mockResolvedValue({ count: 1 });

      await expect(service.delete([5], 'duplicate')).resolves.toEqual({ message: 'Post deleted successfully' });
      expect(mockPostsRepo.delete).toHaveBeenCalledWith([5], 'duplicate');
    });

    it('throws when repo did not delete any posts', async () => {
      mockPostsRepo.delete.mockResolvedValue({ count: 0 });

      await expect(service.delete([999])).rejects.toThrow('No posts were deleted');
    });
  });

  describe('deleteManyByAdmin', () => {
    it('logs admin deletion and returns success message', async () => {
      mockPostsRepo.deleteByAdmin.mockResolvedValue({ count: 2 });

      const result = await service.deleteManyByAdmin([10, 11], 'admin-1');

      expect(result).toEqual({ message: 'Posts deleted successfully' });
      expect(StubAppLogger.info).toHaveBeenCalledWith('Admin id: admin-1 deleted posts 10, 11');
    });
  });

  describe('toggleLike', () => {
    it('removes like when one already exists', async () => {
      mockPostsRepo.getPostById.mockResolvedValue({ id: 3 });
      mockPostsLikeRepo.getLikeByUserPost.mockResolvedValue({ postId: 3, userId: 'user-1' });
      mockPostsLikeRepo.deleteLike.mockResolvedValue(undefined);

      const result = await service.toggleLike(3, 'user-1');

      expect(result).toEqual({ message: 'Like removed', liked: false });
      expect(mockPostsLikeRepo.deleteLike).toHaveBeenCalledWith(3, 'user-1');
      expect(mockPostsCacheService.invalidateLikeRelatedCache).toHaveBeenCalledWith(3, 'user-1');
      expect(mockPostsLikeRepo.createLike).not.toHaveBeenCalled();
    });

    it('creates like when none exists', async () => {
      mockPostsRepo.getPostById.mockResolvedValue({ id: 4 });
      mockPostsLikeRepo.getLikeByUserPost.mockResolvedValue(null);
      mockPostsLikeRepo.createLike.mockResolvedValue(undefined);

      const result = await service.toggleLike(4, 'user-2');

      expect(result).toEqual({ message: 'Like added', liked: true });
      expect(mockPostsLikeRepo.createLike).toHaveBeenCalledWith(4, 'user-2');
      expect(mockPostsCacheService.invalidateLikeRelatedCache).toHaveBeenCalledWith(4, 'user-2');
      expect(mockPostsLikeRepo.deleteLike).not.toHaveBeenCalled();
    });

    it('throws when trying to like a missing post', async () => {
      mockPostsRepo.getPostById.mockResolvedValue(null);

      await expect(service.toggleLike(123, 'user-3')).rejects.toThrow('No posts found');
      expect(mockPostsLikeRepo.getLikeByUserPost).not.toHaveBeenCalled();
    });
  });
});
