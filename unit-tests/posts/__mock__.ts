export const mockPostsRepo = {
  create: jest.fn(),
  findByAuthorIdPaginated: jest.fn(),
  findManyPublic: jest.fn(),
  findManyStaff: jest.fn(),
  getPostById: jest.fn(),
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
