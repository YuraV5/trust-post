import {
  EditMessageInput,
  MessageActionResult,
  MessageListResult,
  MessageWithSenderAndFiles,
  SendMessageInput,
} from '../types';
import { type UserRoles } from '@prisma/client';

export interface IMessageService {
  sendMessage(input: SendMessageInput): Promise<MessageWithSenderAndFiles>;
  sendMessageWithFiles(
    chatId: string,
    senderId: string,
    content: string,
    files?: Express.Multer.File[],
  ): Promise<MessageWithSenderAndFiles>;
  getMessages(chatId: string, userId: string, page?: number, limit?: number): Promise<MessageListResult>;
  editMessage(input: EditMessageInput): Promise<MessageWithSenderAndFiles>;
  deleteMessage(messageId: string, userId: string, role: UserRoles): Promise<MessageActionResult>;
  addFilesToMessage(messageId: string, senderId: string, role: UserRoles, files: Express.Multer.File[]): Promise<void>;
  deleteFile(fileId: string, userId: string, role: UserRoles): Promise<MessageActionResult>;
  markAsRead(chatId: string, userId: string): Promise<MessageActionResult>;
}
