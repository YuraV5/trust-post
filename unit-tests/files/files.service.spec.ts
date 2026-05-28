import { Test, TestingModule } from '@nestjs/testing';
import { FileProvider } from '@prisma/client';
import { FilesService } from '../../src/modules/files/services/files.service';
import { CloudinaryClient } from '../../src/modules/files/services/clients';
import { FileUploadTarget } from '../../src/modules/files/types';

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
      target: FileUploadTarget.POST,
    };

    it('throws when no files are provided', async () => {
      await expect(service.upload([], storageInfo)).rejects.toThrow('No files provided');
    });

    it('delegates to CloudinaryClient for CLOUDINARY storage', async () => {
      const files = [{ buffer: Buffer.from('data'), originalname: 'img.png', mimetype: 'image/png', size: 100 }];
      const uploadResult = { urls: ['https://cdn.example.com/img.png'], keys: ['img.png'] };
      mockCloudinaryClient.upload.mockResolvedValue(uploadResult);

      const result = await service.upload(files, storageInfo);

      expect(mockCloudinaryClient.upload).toHaveBeenCalledWith(files, {
        resourceId: '123',
        userId: 'user-1',
        target: FileUploadTarget.POST,
        storage: FileProvider.CLOUDINARY,
        pathSegment: 'posts',
        requiresResourceId: false,
      });
      expect(result).toEqual(uploadResult);
    });

    it('allows post uploads without resourceId', async () => {
      const files = [{ buffer: Buffer.from('data'), originalname: 'img.png', mimetype: 'image/png', size: 100 }];
      const uploadResult = { urls: ['https://cdn.example.com/img.png'], keys: ['img.png'] };
      mockCloudinaryClient.upload.mockResolvedValue(uploadResult);

      await expect(
        service.upload(files, {
          userId: 'user-1',
          target: FileUploadTarget.POST,
        }),
      ).resolves.toEqual(uploadResult);

      expect(mockCloudinaryClient.upload).toHaveBeenCalledWith(files, {
        resourceId: undefined,
        userId: 'user-1',
        target: FileUploadTarget.POST,
        storage: FileProvider.CLOUDINARY,
        pathSegment: 'posts',
        requiresResourceId: false,
      });
    });
  });

  describe('delete', () => {
    it('does nothing when keys array is empty', async () => {
      await service.delete([]);

      expect(mockCloudinaryClient.delete).not.toHaveBeenCalled();
    });

    it('delegates deletion to CloudinaryClient for CLOUDINARY storage', async () => {
      mockCloudinaryClient.delete.mockResolvedValue(undefined);

      await service.delete(['key-1', 'key-2']);

      expect(mockCloudinaryClient.delete).toHaveBeenCalledWith(['key-1', 'key-2']);
    });
  });
});
