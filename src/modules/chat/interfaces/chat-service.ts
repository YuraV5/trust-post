import {
  ChatWithMembersAndPrivate,
  CreateGroupChatInput,
  CreatePostChatInput,
  CreatePrivateChatInput,
  JoinLeaveActionResult,
  UserChatsResult,
} from '../types';

export interface IChatService {
  createPrivateChat(input: CreatePrivateChatInput): Promise<ChatWithMembersAndPrivate>;
  createGroupChat(input: CreateGroupChatInput): Promise<ChatWithMembersAndPrivate>;
  createPostChat(input: CreatePostChatInput): Promise<ChatWithMembersAndPrivate>;
  joinChat(chatId: string, userId: string): Promise<JoinLeaveActionResult>;
  leaveChat(chatId: string, userId: string): Promise<JoinLeaveActionResult>;
  deleteChatForUser(chatId: string, userId: string): Promise<JoinLeaveActionResult>;
  getUserChats(userId: string, page?: number, limit?: number): Promise<UserChatsResult>;
  getChat(chatId: string, userId: string): Promise<ChatWithMembersAndPrivate>;
  markChatAsRead(chatId: string, userId: string): Promise<{ message: string }>;
}
