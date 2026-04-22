import { Injectable } from '@nestjs/common';
import { type IFileStorage } from '../interfaces';
import { FileUploadRequest, FileUploadResponse } from '../types';
import { CloudinaryClient } from './clients';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { FileProvider } from '@prisma/client';
import { resolveFileStorageInfo } from '../helpers/storage-config.helper';

@Injectable()
export class FilesService implements IFileStorage {
  constructor(private readonly cloudinary: CloudinaryClient) {}

  async upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileUploadRequest,
  ): Promise<FileUploadResponse> {
    if (!files.length) throw new AppBadRequestException('No files provided');

    const resolvedStorage = resolveFileStorageInfo(data);

    switch (resolvedStorage.storage) {
      case FileProvider.CLOUDINARY:
        return this.cloudinary.upload(files, resolvedStorage);
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
