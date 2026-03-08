import { CreateGroupChatInput, CreatePostChatInput, CreatePrivateChatInput } from '../types';

export interface IChatService {
  createPrivateChat(input: CreatePrivateChatInput): Promise<any>;
  createGroupChat(input: CreateGroupChatInput): Promise<any>;
  createPostChat(input: CreatePostChatInput): Promise<any>;
  joinChat(chatId: string, userId: string): Promise<{ message: string }>;
  leaveChat(chatId: string, userId: string): Promise<{ message: string }>;
  deleteChatForUser(chatId: string, userId: string): Promise<{ message: string }>;
  getUserChats(userId: string, page?: number, limit?: number): Promise<any>;
  getChat(chatId: string, userId: string): Promise<any>;
  markChatAsRead(chatId: string, userId: string): Promise<{ message: string }>;
}
