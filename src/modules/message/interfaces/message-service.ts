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
  getMessages(chatId: string, userId: string, cursor?: string, limit?: number): Promise<MessageListResult>;
  editMessage(input: EditMessageInput): Promise<MessageWithSenderAndFiles>;
  deleteMessage(messageId: string, userId: string, role: UserRoles): Promise<MessageActionResult>;
  deleteFile(fileId: string, userId: string, role: UserRoles): Promise<MessageActionResult>;
  markAsRead(chatId: string, userId: string): Promise<MessageActionResult>;
}
