import { IFileStorage } from './file-storage';

export interface ICloudinaryClient extends IFileStorage {
  deleteFolder(folder: string): Promise<void>;
}
