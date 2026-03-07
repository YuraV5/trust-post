import { FileStorageInfo, FileUploadResponse, StorageType } from '../types';

export interface IFileStorage {
  upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileStorageInfo,
  ): Promise<FileUploadResponse>;
  delete(keys: string[], storage: StorageType): Promise<void>;
}
