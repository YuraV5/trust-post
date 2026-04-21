import {
  ChatEntity,
  ChatMemberEntity,
  ChatWithMembers,
  ChatWithMembersAndPrivate,
  ChatRepoUserChatsResult,
  CreateGroupChatInput,
  CreatePrivateChatInput,
  PrivateChatWithChat,
} from '../types';

export interface IChatRepo {
  findPrivateChatBetweenUsers(userId: string, otherUserId: string): Promise<PrivateChatWithChat | null>;
  createPrivateChat(input: CreatePrivateChatInput): Promise<ChatWithMembers>;
  createGroupChat(input: CreateGroupChatInput): Promise<ChatWithMembers>;
  findPostById(postId: number): Promise<{ id: number; authorId: string } | null>;
  findChatByTitle(title: string): Promise<ChatEntity | null>;
  findChatByPostId(postId: number): Promise<ChatWithMembers | null>;
  createPostChat(postId: number, authorId: string): Promise<ChatWithMembers>;
  findUserByEmail(email: string): Promise<{ id: string; isEmailVerified: boolean; isActive: boolean } | null>;
  findChatById(chatId: string): Promise<ChatEntity | null>;
  findChatMember(chatId: string, userId: string, includeDeleted?: boolean): Promise<ChatMemberEntity | null>;
  addChatMember(chatId: string, userId: string): Promise<void>;
  removeChatMember(chatId: string, userId: string): Promise<void>;
  softDeleteChatMember(chatId: string, userId: string): Promise<void>;
  findUserChats(userId: string, page: number, limit: number): Promise<ChatRepoUserChatsResult>;
  findChatWithMembers(chatId: string): Promise<ChatWithMembersAndPrivate | null>;
}
