import { Injectable, Inject } from '@nestjs/common';
import { ChatType } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException, AppForbiddenException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import {
  ChatEntity,
  ChatWithMembers,
  ChatWithMembersAndPrivate,
  CreateGroupChatInput,
  CreatePostChatInput,
  CreatePrivateChatInput,
  JoinLeaveActionResult,
  UserChatsResult,
} from '../types';
import { IChatService } from '../interfaces';
import { ChatRepo } from '../repos';
import { RedisService } from '../../cache/services';

@Injectable()
export class ChatService implements IChatService {
  private readonly CHAT_CACHE_TTL_SECONDS = 30;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: ChatRepo,
    private readonly redisService: RedisService,
  ) {}

  async createPrivateChat(input: CreatePrivateChatInput): Promise<ChatWithMembers | ChatEntity> {
    const { userId, otherUserId } = input;

    if (userId === otherUserId) {
      throw new AppBadRequestException('Cannot create private chat with yourself');
    }

    // Check if private chat already exists
    const existingChat = await this.repo.findPrivateChatBetweenUsers(userId, otherUserId);

    if (existingChat) {
      return existingChat.chat;
    }

    // Create new private chat
    const chat = await this.repo.createPrivateChat(input);

    this.logger.info('Private chat created', { chatId: chat.id, userId, otherUserId });
    return chat;
  }

  async createGroupChat(input: CreateGroupChatInput): Promise<ChatWithMembers> {
    const { title, creatorId, participantIds } = input;

    if (!title || title.trim().length === 0) {
      throw new AppBadRequestException('Group chat title is required');
    }

    if (participantIds.length === 0) {
      throw new AppBadRequestException('At least one participant is required');
    }

    const allParticipants = Array.from(new Set([creatorId, ...participantIds]));
    const chat = await this.repo.createGroupChat(input);

    this.logger.info('Group chat created', { chatId: chat.id, creatorId, participantsCount: allParticipants.length });
    return chat;
  }

  async createPostChat(input: CreatePostChatInput): Promise<ChatWithMembers> {
    const { postId, creatorId } = input;

    // Check if post exists
    const post = await this.repo.findPostById(postId);

    if (!post) {
      throw new AppNotFoundException('Post not found');
    }

    // Check if chat for this post already exists
    const existingChat = await this.repo.findChatByPostId(postId);

    if (existingChat) {
      // If creator is not a member yet, add them
      const isMember = await this.repo.findChatMember(existingChat.id, creatorId);
      if (!isMember) {
        await this.repo.addChatMember(existingChat.id, creatorId);
      }
      return existingChat;
    }

    // Create chat for the post with post author as initial member
    const chat = await this.repo.createPostChat(postId, post.authorId);

    // Add creator if they're not the post author
    if (creatorId !== post.authorId) {
      await this.repo.addChatMember(chat.id, creatorId);
    }

    this.logger.info('Post chat created', { chatId: chat.id, postId, creatorId });
    return chat;
  }

  async joinChat(chatId: string, userId: string): Promise<JoinLeaveActionResult> {
    const chat = await this.repo.findChatById(chatId);

    if (!chat) {
      throw new AppNotFoundException('Chat not found');
    }

    if (chat.type === ChatType.PRIVATE) {
      throw new AppBadRequestException('Cannot join private chat');
    }

    // Check if already a member
    const existingMember = await this.repo.findChatMember(chatId, userId);

    if (existingMember) {
      throw new AppBadRequestException('Already a member of this chat');
    }

    await this.repo.addChatMember(chatId, userId);

    this.logger.info('User joined chat', { chatId, userId });
    return { message: 'Successfully joined the chat' };
  }

  async leaveChat(chatId: string, userId: string): Promise<JoinLeaveActionResult> {
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppNotFoundException('You are not a member of this chat');
    }

    await this.repo.removeChatMember(chatId, userId);

    this.logger.info('User left chat', { chatId, userId });
    return { message: 'Successfully left the chat' };
  }

  async deleteChatForUser(chatId: string, userId: string): Promise<JoinLeaveActionResult> {
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppNotFoundException('You are not a member of this chat');
    }

    await this.repo.removeChatMember(chatId, userId);

    this.logger.info('Chat deleted for user', { chatId, userId });
    return { message: 'Chat deleted successfully' };
  }

  async getUserChats(userId: string, page: number = 1, limit: number = 20): Promise<UserChatsResult> {
    const cacheKey = this.buildCacheKey('user-chats', { userId, page, limit });
    const cached = await this.readCache<UserChatsResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data: chats, total } = await this.repo.findUserChats(userId, page, limit);

    const result = {
      data: chats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.writeCache(cacheKey, result, this.CHAT_CACHE_TTL_SECONDS);
    return result;
  }

  async getChat(chatId: string, userId: string): Promise<ChatWithMembersAndPrivate> {
    const cacheKey = this.buildCacheKey('chat-by-id', { chatId, userId });
    const cached = await this.readCache<ChatWithMembersAndPrivate>(cacheKey);
    if (cached) {
      return cached;
    }

    const chat = await this.repo.findChatWithMembers(chatId);

    if (!chat) {
      throw new AppNotFoundException('Chat not found');
    }

    // Check if user is a member
    const isMember = chat.members.some((member) => member.userId === userId);
    if (!isMember) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    await this.writeCache(cacheKey, chat, this.CHAT_CACHE_TTL_SECONDS);
    return chat;
  }

  async markChatAsRead(chatId: string, userId: string): Promise<{ message: string }> {
    // Verify user is member of chat
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppNotFoundException('You are not a member of this chat');
    }

    // This is a placeholder - you might want to implement read receipts table
    // For now, we'll just return success
    this.logger.info('Chat marked as read', { chatId, userId });
    return { message: 'Chat marked as read' };
  }

  private buildCacheKey(scope: string, payload: unknown): string {
    return `cache:chat:${scope}:${JSON.stringify(payload)}`;
  }

  private async readCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error('Chat cache read failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async writeCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logger.error('Chat cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
