import { AddFileInput } from '../types';

export interface IMessageRepo {
  findChatMember(chatId: string, userId: string): Promise<any | null>;
  createMessage(chatId: string, senderId: string, content: string): Promise<any>;
  touchChat(chatId: string): Promise<void>;
  findMessages(chatId: string, page: number, limit: number): Promise<{ data: any[]; total: number }>;
  findMessageById(messageId: string): Promise<any | null>;
  updateMessageContent(messageId: string, newContent: string): Promise<any>;
  softDeleteMessage(messageId: string): Promise<void>;
  createMessageFile(input: AddFileInput): Promise<any>;
  findFileById(fileId: string): Promise<any | null>;
  deleteFile(fileId: string): Promise<void>;
}
