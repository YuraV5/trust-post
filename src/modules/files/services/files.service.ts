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

  async delete(keys: string[]): Promise<void> {
    if (!keys.length) return;

    const cloudinaryKeys = keys.filter((key) => this.resolveStorageByPath(key) === FileProvider.CLOUDINARY);

    if (cloudinaryKeys.length > 0) {
      await this.cloudinary.delete(cloudinaryKeys);
    }

    if (cloudinaryKeys.length !== keys.length) {
      throw new AppBadRequestException('Unsupported storage');
    }
  }

  private resolveStorageByPath(storageKey: string): FileProvider {
    const normalized = storageKey.replace(/\\/g, '/').trim();

    if (!normalized) {
      throw new AppBadRequestException('Invalid storage key');
    }

    // All current uploads produce Cloudinary public IDs.
    // If we add other backends later, detect them here by key prefix/path convention.
    return FileProvider.CLOUDINARY;
  }
}
