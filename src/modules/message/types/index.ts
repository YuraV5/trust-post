import { type ChatMember, type FileProvider, type Message, type MessageFile, type UserRoles } from '@prisma/client';

export type SendMessageInput = {
  chatId: string;
  senderId: string;
  content: string;
};

export type EditMessageInput = {
  messageId: string;
  userId: string;
  role: UserRoles;
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

export type MessageSender = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
};

export type MessageWithSenderAndFiles = Message & {
  sender: MessageSender;
  files: MessageFile[];
};

export type MessageFileWithMessage = MessageFile & {
  message: Message;
};

export type MessageListResult = {
  data: MessageWithSenderAndFiles[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type MessageRepoListResult = {
  data: MessageWithSenderAndFiles[];
  total: number;
};

export type MessageActionResult = { message: string };

export type ChatMemberEntity = ChatMember;
export type MessageEntity = Message;
export type MessageFileEntity = MessageFile;
