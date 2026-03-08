import { FileProvider } from '@prisma/client/edge';

export type FileStorageInfo = {
  resourceId: number;
  userId: string;
  fileFolder: FileFolder;
  storage: FileProvider;
};

export type FileUploadOptions = {
  filename: string;
  type: FileFolder;
  userId: string;
  resourceId: string;
  storage: FileProvider;
};

export type FileUploadResult = {
  url: string;
  storageKey: string;
  size: number;
  originalName: string;
  mimeType: string;
  provider: FileProvider;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
};

export type FileUploadResponse = {
  data: FileUploadResult[];
  failed: string[];
};

export type NewFileData = {
  url: string;
  storageKey: string;
  userId: string;
  resourceId: string; // postId or chatId depending on type
};

export enum FileFolder {
  AVATAR = 'avatar',
  POSTS = 'posts',
  CHATS = 'chats',
}
