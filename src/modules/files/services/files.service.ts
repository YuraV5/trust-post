import { Injectable } from '@nestjs/common';
import { type IFileStorage } from '../interfaces';
import { FileStorageInfo, FileUploadResponse } from '../types';
import { CloudinaryClientService } from './clients';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { FileProvider } from '@prisma/client';

@Injectable()
export class FilesService implements IFileStorage {
  constructor(private readonly cloudinary: CloudinaryClientService) {}

  async upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileStorageInfo,
  ): Promise<FileUploadResponse> {
    if (!files.length) throw new AppBadRequestException('No files provided');
    switch (data.storage) {
      case FileProvider.CLOUDINARY:
        return this.cloudinary.upload(files, data);
      default:
        throw new AppBadRequestException('Unsupported storage');
    }
  }

  async delete(keys: string[], storage: FileProvider): Promise<void> {
    if (!keys.length) return;
    switch (storage) {
      case FileProvider.CLOUDINARY:
        return this.cloudinary.delete(keys);
      default:
        throw new AppBadRequestException('Unsupported storage');
    }
  }
}
