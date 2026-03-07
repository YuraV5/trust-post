import { Injectable } from '@nestjs/common';
import { type IFileStorage } from '../interfaces';
import { FileStorageInfo, StorageType, FileUploadResponse } from '../types';
import { CloudinaryClientService } from './clients';
import { AppBadRequestException } from '../../../shared/errors/app-errors';

@Injectable()
export class FilesService implements IFileStorage {
  constructor(private readonly cloudinary: CloudinaryClientService) {}

  async upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileStorageInfo,
  ): Promise<FileUploadResponse> {
    switch (data.storage) {
      case StorageType.CLOUDINARY:
        if (!files.length) throw new AppBadRequestException('No files provided');
        return this.cloudinary.upload(files, data);
      default:
        throw new AppBadRequestException('Unsupported storage');
    }
  }

  async delete(keys: string[], storage: StorageType): Promise<void> {
    switch (storage) {
      case StorageType.CLOUDINARY:
        return this.cloudinary.delete(keys);
      default:
        throw new AppBadRequestException('Unsupported storage');
    }
  }
}
