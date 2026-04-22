import { FileProvider } from '@prisma/client';
import { FileUploadRequest, FileUploadResponse } from '../types';

export interface IFileStorage {
  upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileUploadRequest,
  ): Promise<FileUploadResponse>;
  delete(keys: string[], storage: FileProvider): Promise<void>;
}
