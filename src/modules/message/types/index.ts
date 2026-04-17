import {
  type ChatFile,
  type ChatFileType,
  type ChatMember,
  type FileProvider,
  type Message,
  type MessageStatus,
  type MessageType,
  type UserRoles,
} from '@prisma/client';

export type SendMessageInput = {
  chatId: string;
  senderId: string;
  content?: string;
  files?: Express.Multer.File[];
  status?: MessageStatus;
  type?: MessageType;
};

export type EditMessageInput = {
  messageId: string;
  userId: string;
  role: UserRoles;
  newContent: string;
};

export type MessageAttachmentCreateInput = {
  fileType: ChatFileType;
  url: string;
  storageKey: string;
  provider: FileProvider;
  mimeType: string;
  size: number;
  originalName: string;
};

export type AddFileInput = MessageAttachmentCreateInput & {
  messageId: string;
};

export type MessageSender = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
};

export type MessageWithSenderAndFiles = Message & {
  sender: MessageSender;
  attachments: ChatFile[];
};

export type MessageFileWithMessage = ChatFile & {
  message: Message;
};

export type MessageListResult = {
  data: MessageWithSenderAndFiles[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type MessageRepoListResult = {
  data: MessageWithSenderAndFiles[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type MessageActionResult = { message: string };

export type ChatMemberEntity = ChatMember;
export type MessageEntity = Message;
export type MessageFileEntity = ChatFile;
