export const mockTokensService = {
  verifyAccess: jest.fn(),
};
export const mockPostsRepo = {
  create: jest.fn(),
  findByAuthorIdPaginated: jest.fn(),
  findManyPublic: jest.fn(),
  findManyStaff: jest.fn(),
  getPostById: jest.fn(),
  getPostLikeSummary: jest.fn(),
  updateStatus: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteByAdmin: jest.fn(),
};

export const mockPostsLikeRepo = {
  getLikeByUserPost: jest.fn(),
  deleteLike: jest.fn(),
  createLike: jest.fn(),
};

export const mockPostsQueueService = {
  assignReviewerToPost: jest.fn(),
};

export const mockPostsCacheService = {
  getUserPosts: jest.fn(),
  setUserPosts: jest.fn().mockResolvedValue(undefined),
  getPublicPosts: jest.fn(),
  setPublicPosts: jest.fn().mockResolvedValue(undefined),
  getStaffPosts: jest.fn(),
  setStaffPosts: jest.fn().mockResolvedValue(undefined),
  getPostById: jest.fn(),
  setPostById: jest.fn().mockResolvedValue(undefined),
  invalidateLikeRelatedCache: jest.fn().mockResolvedValue(undefined),
  invalidatePostMutationCache: jest.fn().mockResolvedValue(undefined),
};

export const mockQueueRetryHandler = {
  runOrThrow: jest.fn((action: () => Promise<void>) => action()),
};
