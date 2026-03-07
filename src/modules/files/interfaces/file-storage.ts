import { FileProvider } from '@prisma/client';
import { FileStorageInfo, FileUploadResponse } from '../types';

export interface IFileStorage {
  upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileStorageInfo,
  ): Promise<FileUploadResponse>;
  delete(keys: string[], storage: FileProvider): Promise<void>;
}
