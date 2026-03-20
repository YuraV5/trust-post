import { Test, TestingModule } from '@nestjs/testing';
import { FileProvider } from '@prisma/client';
import { FilesService } from '../../src/modules/files/services/files.service';
import { CloudinaryClient } from '../../src/modules/files/services/clients';
import { FileFolder, FileStorageInfo } from '../../src/modules/files/types';

describe('FilesService', () => {
  let service: FilesService;

  const mockCloudinaryClient = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesService, { provide: CloudinaryClient, useValue: mockCloudinaryClient }],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    const storageInfo = {
      resourceId: 123,
      userId: 'user-1',
      storage: FileProvider.CLOUDINARY,
      fileFolder: FileFolder.POSTS,
    };

    it('throws when no files are provided', async () => {
      await expect(service.upload([], storageInfo)).rejects.toThrow('No files provided');
    });

    it('delegates to CloudinaryClient for CLOUDINARY storage', async () => {
      const files = [{ buffer: Buffer.from('data'), originalname: 'img.png', mimetype: 'image/png', size: 100 }];
      const uploadResult = { urls: ['https://cdn.example.com/img.png'], keys: ['img.png'] };
      mockCloudinaryClient.upload.mockResolvedValue(uploadResult);

      const result = await service.upload(files, storageInfo);

      expect(mockCloudinaryClient.upload).toHaveBeenCalledWith(files, storageInfo);
      expect(result).toEqual(uploadResult);
    });

    it('throws for unsupported storage provider', async () => {
      const files = [{ buffer: Buffer.from('data'), originalname: 'img.png', mimetype: 'image/png', size: 100 }];

      await expect(
        service.upload(files, {
          resourceId: 123,
          userId: 'user-1',
          storage: 'S3' as FileProvider,
          fileFolder: FileFolder.POSTS,
        }),
      ).rejects.toThrow('Unsupported storage');
    });
  });

  describe('delete', () => {
    it('does nothing when keys array is empty', async () => {
      await service.delete([], FileProvider.CLOUDINARY);

      expect(mockCloudinaryClient.delete).not.toHaveBeenCalled();
    });

    it('delegates deletion to CloudinaryClient for CLOUDINARY storage', async () => {
      mockCloudinaryClient.delete.mockResolvedValue(undefined);

      await service.delete(['key-1', 'key-2'], FileProvider.CLOUDINARY);

      expect(mockCloudinaryClient.delete).toHaveBeenCalledWith(['key-1', 'key-2']);
    });

    it('throws for unsupported storage provider', async () => {
      await expect(service.delete(['key-1'], 'S3' as FileProvider)).rejects.toThrow('Unsupported storage');
    });
  });
});
