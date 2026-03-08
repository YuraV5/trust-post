import { CreateGroupChatInput, CreatePrivateChatInput } from '../types';

export interface IChatRepo {
  findPrivateChatBetweenUsers(userId: string, otherUserId: string): Promise<any | null>;
  createPrivateChat(input: CreatePrivateChatInput): Promise<any>;
  createGroupChat(input: CreateGroupChatInput): Promise<any>;
  findPostById(postId: number): Promise<{ id: number; authorId: string } | null>;
  findChatByTitle(title: string): Promise<any | null>;
  findChatByPostId(postId: number): Promise<any | null>;
  createPostChat(postId: number, authorId: string): Promise<any>;
  findChatById(chatId: string): Promise<any | null>;
  findChatMember(chatId: string, userId: string): Promise<any | null>;
  addChatMember(chatId: string, userId: string): Promise<void>;
  removeChatMember(chatId: string, userId: string): Promise<void>;
  findUserChats(userId: string, page: number, limit: number): Promise<{ data: any[]; total: number }>;
  findChatWithMembers(chatId: string): Promise<any | null>;
}
