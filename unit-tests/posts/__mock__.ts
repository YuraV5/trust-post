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
  setUserPosts: jest.fn(),
  getPublicPosts: jest.fn(),
  setPublicPosts: jest.fn(),
  getStaffPosts: jest.fn(),
  setStaffPosts: jest.fn(),
  getPostById: jest.fn(),
  setPostById: jest.fn(),
  invalidateLikeRelatedCache: jest.fn(),
  invalidatePostMutationCache: jest.fn(),
};

export const mockQueueRetryHandler = {
  runOrThrow: jest.fn((action: () => Promise<void>) => action()),
};
