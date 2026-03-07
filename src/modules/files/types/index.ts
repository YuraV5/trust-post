export type FileStorageInfo = {
  resourceId: number;
  userId: string;
  fileFolder: FileFolder;
  storage: StorageType;
};

export type FileUploadOptions = {
  filename: string;
  type: FileFolder;
  userId: string;
  resourceId: string;
  storage: StorageType;
};

export type FileUploadResult = {
  url: string;
  storageKey: string;
  size: number;
  originName: string;
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

export enum FileFolder {
  AVATAR = 'avatar',
  POSTS = 'posts',
  CHATS = 'chats',
}

export enum StorageType {
  CLOUDINARY = 'cloudinary',
  LOCAL = 'local',
}
