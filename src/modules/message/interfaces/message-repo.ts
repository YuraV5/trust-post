import {
  AddFileInput,
  ChatMemberEntity,
  MessageEntity,
  MessageFileEntity,
  MessageAttachmentCreateInput,
  MessageFileWithMessage,
  MessageRepoListResult,
  MessageWithSenderAndFiles,
} from '../types';

export interface IMessageRepo {
  findChatMember(chatId: string, userId: string): Promise<ChatMemberEntity | null>;
  createMessage(input: {
    chatId: string;
    senderId: string;
    content: string | null;
    type: 'TEXT' | 'FILE' | 'MIXED' | 'SYSTEM';
    status: 'SENDING' | 'SENT' | 'FAILED';
    files?: MessageAttachmentCreateInput[];
  }): Promise<MessageWithSenderAndFiles>;
  touchChat(chatId: string): Promise<void>;
  findMessages(chatId: string, cursor: Date | null, limit: number): Promise<MessageRepoListResult>;
  findMessageById(messageId: string): Promise<MessageEntity | null>;
  findMessageWithSenderAndFiles(messageId: string): Promise<MessageWithSenderAndFiles | null>;
  updateMessageContent(messageId: string, newContent: string): Promise<MessageWithSenderAndFiles>;
  updateMessageType(messageId: string, type: 'TEXT' | 'FILE' | 'MIXED' | 'SYSTEM'): Promise<MessageWithSenderAndFiles>;
  softDeleteMessage(messageId: string): Promise<void>;
  createMessageFile(input: AddFileInput): Promise<MessageFileEntity>;
  findFileById(fileId: string): Promise<MessageFileWithMessage | null>;
  deleteFile(fileId: string): Promise<void>;
  deleteFilesByMessageId(messageId: string): Promise<void>;
}
