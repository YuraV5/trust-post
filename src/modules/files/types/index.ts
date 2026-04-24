import { FileProvider } from '@prisma/client';

export enum FileUploadTarget {
  PROFILE = 'profile',
  POST = 'post',
  CHAT = 'chat',
}

export type FileUploadRequest = {
  resourceId?: number | string;
  userId: string;
  target: FileUploadTarget;
};

export type FileUploadConfig = {
  storage: FileProvider;
  pathSegment: string;
  requiresResourceId: boolean;
};

export type ResolvedFileStorageInfo = FileUploadRequest & {
  resourceId?: string;
  storage: FileProvider;
  pathSegment: string;
  requiresResourceId: boolean;
};

export type FileUploadOptions = {
  filename: string;
  type: string;
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
