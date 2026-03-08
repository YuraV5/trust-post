import {
  EditMessageInput,
  MessageActionResult,
  MessageListResult,
  MessageWithSenderAndFiles,
  SendMessageInput,
} from '../types';

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
  deleteMessage(messageId: string, userId: string): Promise<MessageActionResult>;
  deleteFile(fileId: string, userId: string): Promise<MessageActionResult>;
  markAsRead(chatId: string, userId: string): Promise<MessageActionResult>;
}
