import { Test, TestingModule } from '@nestjs/testing';
import { ChatType } from '@prisma/client';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { ChatService } from '../../src/modules/chat/services/chat.service';
import { ChatRepo } from '../../src/modules/chat/repos';
import { RedisService } from '../../src/modules/cache/services';
import { SocketService } from '../../src/modules/socket/socket.service';
import { StubAppLogger, mockRedisService, mockSocketService } from '../__mock__';

describe('ChatService', () => {
  let service: ChatService;

  const mockChatRepo = {
    findPrivateChatBetweenUsers: jest.fn(),
    createPrivateChat: jest.fn(),
    createGroupChat: jest.fn(),
    findPostById: jest.fn(),
    findChatByPostId: jest.fn(),
    findChatMember: jest.fn(),
    addChatMember: jest.fn(),
    removeChatMember: jest.fn(),
    createPostChat: jest.fn(),
    findChatById: jest.fn(),
    findUserChats: jest.fn(),
    findChatWithMembers: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatRepo, useValue: mockChatRepo },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SocketService, useValue: mockSocketService },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPrivateChat', () => {
    it('throws when user tries to create a chat with themselves', async () => {
      await expect(
        service.createPrivateChat({ userId: 'user-1', otherUserId: 'user-1' }),
      ).rejects.toThrow('Cannot create private chat with yourself');
    });

    it('returns existing chat when private chat already exists', async () => {
      const existingChat = { id: 'chat-1', type: ChatType.PRIVATE };
      const hydratedChat = {
        id: 'chat-1',
        type: ChatType.PRIVATE,
        members: [{ userId: 'user-1' }, { userId: 'user-2' }],
        PrivateChat: null,
      };
      mockChatRepo.findPrivateChatBetweenUsers.mockResolvedValue({ chat: existingChat });
      mockChatRepo.findChatWithMembers.mockResolvedValue(hydratedChat);

      const result = await service.createPrivateChat({ userId: 'user-1', otherUserId: 'user-2' });

      expect(result).toEqual(hydratedChat);
      expect(mockChatRepo.createPrivateChat).not.toHaveBeenCalled();
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-1', 'chat:upserted', { chat: hydratedChat });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-2', 'chat:upserted', { chat: hydratedChat });
    });

    it('creates a new private chat when none exists', async () => {
      const newChat = { id: 'chat-new', type: ChatType.PRIVATE };
      const hydratedChat = {
        id: 'chat-new',
        type: ChatType.PRIVATE,
        members: [{ userId: 'user-1' }, { userId: 'user-2' }],
        PrivateChat: null,
      };
      mockChatRepo.findPrivateChatBetweenUsers.mockResolvedValue(null);
      mockChatRepo.createPrivateChat.mockResolvedValue(newChat);
      mockChatRepo.findChatWithMembers.mockResolvedValue(hydratedChat);

      const result = await service.createPrivateChat({ userId: 'user-1', otherUserId: 'user-2' });

      expect(result).toEqual(hydratedChat);
      expect(mockChatRepo.createPrivateChat).toHaveBeenCalledWith({ userId: 'user-1', otherUserId: 'user-2' });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-1', 'chat:upserted', { chat: hydratedChat });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-2', 'chat:upserted', { chat: hydratedChat });
    });
  });

  describe('createGroupChat', () => {
    it('throws when title is empty', async () => {
      await expect(
        service.createGroupChat({ title: '', creatorId: 'user-1', participantIds: ['user-2'] }),
      ).rejects.toThrow('Group chat title is required');
    });

    it('throws when no participants are provided', async () => {
      await expect(
        service.createGroupChat({ title: 'My Group', creatorId: 'user-1', participantIds: [] }),
      ).rejects.toThrow('At least one participant is required');
    });

    it('creates group chat and returns it', async () => {
      const chat = { id: 'group-chat-1', type: ChatType.GROUP };
      const hydratedChat = {
        id: 'group-chat-1',
        type: ChatType.GROUP,
        members: [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }],
        PrivateChat: null,
      };
      mockChatRepo.createGroupChat.mockResolvedValue(chat);
      mockChatRepo.findChatWithMembers.mockResolvedValue(hydratedChat);

      const result = await service.createGroupChat({
        title: 'Dev Team',
        creatorId: 'user-1',
        participantIds: ['user-2', 'user-3'],
      });

      expect(result).toEqual(hydratedChat);
      expect(mockChatRepo.createGroupChat).toHaveBeenCalled();
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-1', 'chat:upserted', { chat: hydratedChat });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-2', 'chat:upserted', { chat: hydratedChat });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-3', 'chat:upserted', { chat: hydratedChat });
    });
  });

  describe('createPostChat', () => {
    it('throws when post does not exist', async () => {
      mockChatRepo.findPostById.mockResolvedValue(null);

      await expect(
        service.createPostChat({ postId: 99, creatorId: 'user-1' }),
      ).rejects.toThrow('Post not found');
    });

    it('returns existing post chat and adds creator if not a member', async () => {
      const existingChat = {
        id: 'chat-post-1',
        members: [{ userId: 'author-1' }],
      };
      const hydratedChat = {
        id: 'chat-post-1',
        type: 'POST',
        members: [{ userId: 'author-1' }, { userId: 'user-1' }],
        PrivateChat: null,
      };
      mockChatRepo.findPostById.mockResolvedValue({ id: 99, authorId: 'author-1' });
      mockChatRepo.findChatByPostId.mockResolvedValue(existingChat);
      mockChatRepo.findChatMember.mockResolvedValue(null);
      mockChatRepo.findChatWithMembers.mockResolvedValue(hydratedChat);

      const result = await service.createPostChat({ postId: 99, creatorId: 'user-1' });

      expect(result).toEqual(hydratedChat);
      expect(mockChatRepo.addChatMember).toHaveBeenCalledWith('chat-post-1', 'user-1');
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'author-1', 'chat:upserted', { chat: hydratedChat });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-1', 'chat:upserted', { chat: hydratedChat });
    });

    it('creates post chat and adds creator when creator is not the author', async () => {
      const hydratedChat = {
        id: 'new-post-chat',
        type: 'POST',
        members: [{ userId: 'author-1' }, { userId: 'user-1' }],
        PrivateChat: null,
      };
      mockChatRepo.findPostById.mockResolvedValue({ id: 99, authorId: 'author-1' });
      mockChatRepo.findChatByPostId.mockResolvedValue(null);
      mockChatRepo.createPostChat.mockResolvedValue({ id: 'new-post-chat' });
      mockChatRepo.findChatWithMembers.mockResolvedValue(hydratedChat);

      const result = await service.createPostChat({ postId: 99, creatorId: 'user-1' });

      expect(result).toEqual(hydratedChat);
      expect(mockChatRepo.addChatMember).toHaveBeenCalledWith('new-post-chat', 'user-1');
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'author-1', 'chat:upserted', { chat: hydratedChat });
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith('chat', 'user-1', 'chat:upserted', { chat: hydratedChat });
    });
  });

  describe('joinChat', () => {
    it('throws when chat does not exist', async () => {
      mockChatRepo.findChatById.mockResolvedValue(null);

      await expect(service.joinChat('chat-1', 'user-1')).rejects.toThrow('Chat not found');
    });

    it('throws when trying to join a private chat', async () => {
      mockChatRepo.findChatById.mockResolvedValue({ id: 'chat-1', type: ChatType.PRIVATE });

      await expect(service.joinChat('chat-1', 'user-1')).rejects.toThrow('Cannot join private chat');
    });

    it('throws when user is already a member', async () => {
      mockChatRepo.findChatById.mockResolvedValue({ id: 'chat-1', type: ChatType.GROUP });
      mockChatRepo.findChatMember.mockResolvedValue({ userId: 'user-1' });

      await expect(service.joinChat('chat-1', 'user-1')).rejects.toThrow('Already a member of this chat');
    });

    it('adds user to chat and returns success message', async () => {
      mockChatRepo.findChatById.mockResolvedValue({ id: 'chat-1', type: ChatType.GROUP });
      mockChatRepo.findChatMember.mockResolvedValue(null);
      mockChatRepo.addChatMember.mockResolvedValue(undefined);

      const result = await service.joinChat('chat-1', 'user-1');

      expect(result).toEqual({ message: 'Successfully joined the chat' });
      expect(mockChatRepo.addChatMember).toHaveBeenCalledWith('chat-1', 'user-1');
    });
  });

  describe('leaveChat', () => {
    it('throws when user is not a member', async () => {
      mockChatRepo.findChatMember.mockResolvedValue(null);

      await expect(service.leaveChat('chat-1', 'user-1')).rejects.toThrow('You are not a member of this chat');
    });

    it('removes user and returns success message', async () => {
      mockChatRepo.findChatMember.mockResolvedValue({ userId: 'user-1' });
      mockChatRepo.removeChatMember.mockResolvedValue(undefined);

      const result = await service.leaveChat('chat-1', 'user-1');

      expect(result).toEqual({ message: 'Successfully left the chat' });
      expect(mockChatRepo.removeChatMember).toHaveBeenCalledWith('chat-1', 'user-1');
    });
  });

  describe('deleteChatForUser', () => {
    it('throws when user is not a member', async () => {
      mockChatRepo.findChatMember.mockResolvedValue(null);

      await expect(service.deleteChatForUser('chat-1', 'user-1')).rejects.toThrow('You are not a member of this chat');
    });

    it('removes user and returns delete confirmation', async () => {
      mockChatRepo.findChatMember.mockResolvedValue({ userId: 'user-1' });
      mockChatRepo.removeChatMember.mockResolvedValue(undefined);

      const result = await service.deleteChatForUser('chat-1', 'user-1');

      expect(result).toEqual({ message: 'Chat deleted successfully' });
    });
  });

  describe('getUserChats', () => {
    it('returns cached user chats when cache hit', async () => {
      const cached = {
        data: [{ id: 'chat-1' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      (mockRedisService.get as jest.Mock).mockResolvedValue(JSON.stringify(cached));

      const result = await service.getUserChats('user-1', 1, 20);

      expect(result).toEqual(cached);
      expect(mockChatRepo.findUserChats).not.toHaveBeenCalled();
    });

    it('reads from repo and writes to cache when cache miss', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      mockChatRepo.findUserChats.mockResolvedValue({
        data: [{ id: 'chat-2' }],
        total: 21,
      });

      const result = await service.getUserChats('user-1', 2, 10);

      expect(result).toEqual({
        data: [{ id: 'chat-2' }],
        pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
      });
      expect(mockChatRepo.findUserChats).toHaveBeenCalledWith('user-1', 2, 10);
      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChat', () => {
    it('returns cached chat when cache hit', async () => {
      const cachedChat = {
        id: 'chat-1',
        members: [{ userId: 'user-1' }],
        PrivateChat: null,
      };
      (mockRedisService.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedChat));

      const result = await service.getChat('chat-1', 'user-1');

      expect(result).toEqual(cachedChat);
      expect(mockChatRepo.findChatWithMembers).not.toHaveBeenCalled();
    });

    it('throws when chat is not found', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      mockChatRepo.findChatWithMembers.mockResolvedValue(null);

      await expect(service.getChat('chat-404', 'user-1')).rejects.toThrow('Chat not found');
    });

    it('throws when user is not member of chat', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      mockChatRepo.findChatWithMembers.mockResolvedValue({
        id: 'chat-1',
        members: [{ userId: 'user-2' }],
        PrivateChat: null,
      });

      await expect(service.getChat('chat-1', 'user-1')).rejects.toThrow('You are not a member of this chat');
    });

    it('returns chat and writes to cache when user is member', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      const chat = {
        id: 'chat-1',
        members: [{ userId: 'user-1' }],
        PrivateChat: null,
      };
      mockChatRepo.findChatWithMembers.mockResolvedValue(chat);

      const result = await service.getChat('chat-1', 'user-1');

      expect(result).toEqual(chat);
      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('markChatAsRead', () => {
    it('throws when user is not a member', async () => {
      mockChatRepo.findChatMember.mockResolvedValue(null);

      await expect(service.markChatAsRead('chat-1', 'user-1')).rejects.toThrow('You are not a member of this chat');
    });

    it('returns success message when user is a member', async () => {
      mockChatRepo.findChatMember.mockResolvedValue({ userId: 'user-1' });

      const result = await service.markChatAsRead('chat-1', 'user-1');

      expect(result).toEqual({ message: 'Chat marked as read' });
    });
  });
});
