import { FileProvider } from '@prisma/client';

export type SendMessageInput = {
  chatId: string;
  senderId: string;
  content: string;
};

export type EditMessageInput = {
  messageId: string;
  userId: string;
  newContent: string;
};

export type AddFileInput = {
  messageId: string;
  url: string;
  storageKey: string;
  provider: FileProvider;
  mimeType: string;
  size: number;
  originalName: string;
};
