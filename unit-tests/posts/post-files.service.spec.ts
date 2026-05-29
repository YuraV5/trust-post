import { PostFilesService } from '../../src/modules/posts/posts-files/services/post-files.service';
import { FileProvider } from '@prisma/client';
import { StubAppLogger } from '../__mock__';

describe('PostFilesService', () => {
  const postFilesRepoMock = {
    withPostLock: jest.fn((postId: number, cb: (tx: unknown) => Promise<unknown>) => cb({})),
    countFilesByPostId: jest.fn(),
    getTotalFileSizeByPostId: jest.fn(),
    hasMainImage: jest.fn(),
    normalizeMainImageValues: jest.fn(),
    insertMultipleFiles: jest.fn(),
    getFilesByPostId: jest.fn(),
    deleteFilesByPostIdAndStorageKeys: jest.fn(),
    getFileById: jest.fn(),
    deleteFileById: jest.fn(),
    setFileAsMainImage: jest.fn(),
    getPostFilesDetail: jest.fn(),
    getPublicPostFilesDetail: jest.fn(),
  };

  const filesServiceMock = {
    delete: jest.fn(),
  };

  let service: PostFilesService;

  const makeFileRecord = (overrides = {}) => ({
    postId: 1,
    uploadedById: 'user-1',
    storageKey: 'trust-post/user-1/posts/1/file.jpg',
    provider: FileProvider.CLOUDINARY,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    postFilesRepoMock.withPostLock.mockImplementation(
      (_postId: number, cb: (tx: unknown) => Promise<unknown>) => cb({}),
    );
    postFilesRepoMock.getTotalFileSizeByPostId.mockResolvedValue(0);
    service = new PostFilesService(StubAppLogger, postFilesRepoMock as any, filesServiceMock as any);
  });

  describe('uploadFilesToPost', () => {
    it('returns early message when no files provided', async () => {
      const result = await service.uploadFilesToPost([]);

      expect(result).toEqual({ message: 'No files to upload' });
      expect(postFilesRepoMock.withPostLock).not.toHaveBeenCalled();
    });

    it('rejects when files fail scope validation', async () => {
      // Different postIds in the same batch = invalid scope
      const files = [
        makeFileRecord({ postId: 1 }),
        makeFileRecord({ postId: 2 }),
      ];

      const result = await service.uploadFilesToPost(files);

      expect(result.message).toContain('Invalid file scope');
      expect(postFilesRepoMock.withPostLock).not.toHaveBeenCalled();
    });

    it('returns limit-exceeded message when upload would exceed max files', async () => {
      postFilesRepoMock.countFilesByPostId.mockResolvedValue(9); // already 9 of 10 max
      const files = [makeFileRecord(), makeFileRecord({ storageKey: 'trust-post/user-1/posts/1/file2.jpg' })];

      const result = await service.uploadFilesToPost(files);

      expect(result.message).toContain('Cannot upload');
      expect(postFilesRepoMock.insertMultipleFiles).not.toHaveBeenCalled();
    });

    it('inserts files and returns success message on happy path', async () => {
      postFilesRepoMock.countFilesByPostId.mockResolvedValue(0);
      postFilesRepoMock.getTotalFileSizeByPostId.mockResolvedValue(0);
      postFilesRepoMock.hasMainImage.mockResolvedValue(false);
      postFilesRepoMock.insertMultipleFiles.mockResolvedValue({ count: 1 });

      const result = await service.uploadFilesToPost([makeFileRecord()]);

      expect(postFilesRepoMock.insertMultipleFiles).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Files uploaded and linked to post successfully' });
    });

    it('returns duplicate message when no files were actually inserted', async () => {
      postFilesRepoMock.countFilesByPostId.mockResolvedValue(0);
      postFilesRepoMock.getTotalFileSizeByPostId.mockResolvedValue(0);
      postFilesRepoMock.hasMainImage.mockResolvedValue(false);
      postFilesRepoMock.insertMultipleFiles.mockResolvedValue({ count: 0 });

      const result = await service.uploadFilesToPost([makeFileRecord()]);

      expect(result.message).toContain('No new files were linked');
    });
  });

  describe('deleteFilesByPostId', () => {
    it('returns early message when no files found for post', async () => {
      postFilesRepoMock.getFilesByPostId.mockResolvedValue([]);

      const result = await service.deleteFilesByPostId(1);

      expect(result).toEqual({ message: 'No files to delete' });
      expect(filesServiceMock.delete).not.toHaveBeenCalled();
    });

    it('deletes single file from storage and DB', async () => {
      const file = { storageKey: 'trust-post/u1/posts/1/img.jpg', provider: FileProvider.CLOUDINARY };
      postFilesRepoMock.getFilesByPostId.mockResolvedValue([file]);
      filesServiceMock.delete.mockResolvedValue(undefined);
      postFilesRepoMock.deleteFilesByPostIdAndStorageKeys.mockResolvedValue({ count: 1 });

      const result = await service.deleteFilesByPostId(1);

      expect(filesServiceMock.delete).toHaveBeenCalledWith([file.storageKey]);
      expect(result.message).toContain('Successfully deleted 1 files');
    });

    it('reports partial success when storage deletion fails for one file', async () => {
      const file = { storageKey: 'trust-post/u1/posts/1/img.jpg', provider: FileProvider.CLOUDINARY };
      postFilesRepoMock.getFilesByPostId.mockResolvedValue([file]);
      filesServiceMock.delete.mockRejectedValue(new Error('Cloudinary error'));
      postFilesRepoMock.deleteFilesByPostIdAndStorageKeys.mockResolvedValue({ count: 0 });

      const result = await service.deleteFilesByPostId(1);

      expect(result.message).toContain('Files deleted with some errors');
    });

    it('throws when DB deletion of records fails', async () => {
      const file = { storageKey: 'trust-post/u1/posts/1/img.jpg', provider: FileProvider.CLOUDINARY };
      postFilesRepoMock.getFilesByPostId.mockResolvedValue([file]);
      filesServiceMock.delete.mockResolvedValue(undefined);
      postFilesRepoMock.deleteFilesByPostIdAndStorageKeys.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteFilesByPostId(1)).rejects.toThrow('DB error');
    });
  });

  describe('deleteFileById', () => {
    it('returns not-found message when file does not exist', async () => {
      postFilesRepoMock.getFileById.mockResolvedValue(null);

      const result = await service.deleteFileById(42);

      expect(result).toEqual({ message: 'File not found' });
      expect(filesServiceMock.delete).not.toHaveBeenCalled();
    });

    it('returns failure message when storage deletion fails', async () => {
      postFilesRepoMock.getFileById.mockResolvedValue({
        storageKey: 'key',
        provider: FileProvider.CLOUDINARY,
      });
      filesServiceMock.delete.mockRejectedValue(new Error('Storage error'));

      const result = await service.deleteFileById(1);

      expect(result.message).toContain('Failed to delete file from storage');
      expect(postFilesRepoMock.deleteFileById).not.toHaveBeenCalled();
    });

    it('throws when DB record deletion fails after successful storage deletion', async () => {
      postFilesRepoMock.getFileById.mockResolvedValue({
        storageKey: 'key',
        provider: FileProvider.CLOUDINARY,
      });
      filesServiceMock.delete.mockResolvedValue(undefined);
      postFilesRepoMock.deleteFileById.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteFileById(1)).rejects.toThrow('DB error');
    });

    it('returns success message on happy path', async () => {
      postFilesRepoMock.getFileById.mockResolvedValue({
        storageKey: 'key',
        provider: FileProvider.CLOUDINARY,
      });
      filesServiceMock.delete.mockResolvedValue(undefined);
      postFilesRepoMock.deleteFileById.mockResolvedValue(undefined);

      const result = await service.deleteFileById(1);

      expect(result).toEqual({ message: 'File deleted successfully' });
    });
  });

  describe('setMainImage', () => {
    it('returns not-found message when file does not belong to post', async () => {
      postFilesRepoMock.setFileAsMainImage.mockResolvedValue(null);

      const result = await service.setMainImage(1, 99);

      expect(result).toEqual({ message: 'File not found for the provided post' });
    });

    it('returns success message when main image is updated', async () => {
      postFilesRepoMock.setFileAsMainImage.mockResolvedValue({ id: 5, isMain: true });

      const result = await service.setMainImage(1, 5);

      expect(result).toEqual({ message: 'Main image updated successfully' });
    });
  });

  describe('getPostFiles', () => {
    it('delegates to repo and returns files', async () => {
      const files = [{ id: 1, storageKey: 'key', postId: 1 }];
      postFilesRepoMock.getPostFilesDetail.mockResolvedValue(files);

      const result = await service.getPostFiles(1);

      expect(result).toEqual(files);
      expect(postFilesRepoMock.getPostFilesDetail).toHaveBeenCalledWith(1);
    });
  });

  describe('getPublicPostFiles', () => {
    it('delegates to repo and returns only public files', async () => {
      const files = [{ id: 7, storageKey: 'public-key', postId: 2 }];
      postFilesRepoMock.getPublicPostFilesDetail.mockResolvedValue(files);

      const result = await service.getPublicPostFiles(2);

      expect(result).toEqual(files);
      expect(postFilesRepoMock.getPublicPostFilesDetail).toHaveBeenCalledWith(2);
    });
  });
});
