import { FileProvider } from '@prisma/client';

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

export type NewFileRecordData = FileUploadResult & {
  uploadedById: string;
  postId: number;
  mainImage?: boolean;
};

export type GroupedPostFileKeysRow = {
  provider: string;
  storageKeys: string[];
};
