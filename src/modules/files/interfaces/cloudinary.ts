import { IFileStorage } from './file-storage';

export interface ICloudinaryClient extends IFileStorage {
  deleteFolder(folder: string): Promise<void>;
  findOrphanCandidates(
    prefix: string,
    nextCursor?: string,
  ): Promise<{ resources: { public_id: string; created_at: string }[]; nextCursor?: string }>;
}
