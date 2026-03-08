import {
  AddFileInput,
  ChatMemberEntity,
  MessageEntity,
  MessageFileEntity,
  MessageFileWithMessage,
  MessageRepoListResult,
  MessageWithSenderAndFiles,
} from '../types';

export interface IMessageRepo {
  findChatMember(chatId: string, userId: string): Promise<ChatMemberEntity | null>;
  createMessage(chatId: string, senderId: string, content: string): Promise<MessageWithSenderAndFiles>;
  touchChat(chatId: string): Promise<void>;
  findMessages(chatId: string, page: number, limit: number): Promise<MessageRepoListResult>;
  findMessageById(messageId: string): Promise<MessageEntity | null>;
  updateMessageContent(messageId: string, newContent: string): Promise<MessageWithSenderAndFiles>;
  softDeleteMessage(messageId: string): Promise<void>;
  createMessageFile(input: AddFileInput): Promise<MessageFileEntity>;
  findFileById(fileId: string): Promise<MessageFileWithMessage | null>;
  deleteFile(fileId: string): Promise<void>;
}
