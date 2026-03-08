import { AddFileInput, EditMessageInput, SendMessageInput } from '../types';

export interface IMessageService {
  sendMessage(input: SendMessageInput): Promise<any>;
  getMessages(chatId: string, userId: string, page?: number, limit?: number): Promise<any>;
  editMessage(input: EditMessageInput): Promise<any>;
  deleteMessage(messageId: string, userId: string): Promise<{ message: string }>;
  addFiles(input: AddFileInput): Promise<any>;
  deleteFile(fileId: string, userId: string): Promise<{ message: string }>;
  markAsRead(chatId: string, userId: string): Promise<{ message: string }>;
}
