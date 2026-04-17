import { Test, TestingModule } from '@nestjs/testing';
import { APP_LOGGER } from '../../src/shared/logger/services/app-logger';
import { MessageService } from '../../src/modules/message/services/message.service';
import { MessageRepo } from '../../src/modules/message/repos';
import { FilesService } from '../../src/modules/files/services';
import { RedisService } from '../../src/modules/cache/services';
import { SocketService } from '../../src/modules/socket/socket.service';
import { UserRoles } from '@prisma/client';
import { StubAppLogger, mockRedisService, mockSocketService } from '../__mock__';
import { mockMessageRepo, mockFilesService } from './__mock__';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: MessageRepo, useValue: mockMessageRepo },
        { provide: FilesService, useValue: mockFilesService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SocketService, useValue: mockSocketService },
        { provide: APP_LOGGER, useValue: StubAppLogger },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('throws when message has no content and no attachments', async () => {
      await expect(service.sendMessage({ chatId: 'c-1', senderId: 'u-1', content: '   ' })).rejects.toThrow(
        'Message must contain text or attachments',
      );
    });

    it('throws when sender is not a chat member', async () => {
      mockMessageRepo.findChatMember.mockResolvedValue(null);

      await expect(service.sendMessage({ chatId: 'c-1', senderId: 'u-1', content: 'Hello' })).rejects.toThrow(
        'You are not a member of this chat',
      );
    });

    it('creates message and returns it', async () => {
      const message = { id: 'msg-1', content: 'Hello', chatId: 'c-1', senderId: 'u-1', attachments: [] };
      mockMessageRepo.findChatMember.mockResolvedValue({ userId: 'u-1' });
      mockMessageRepo.createMessage.mockResolvedValue(message);

      const result = await service.sendMessage({ chatId: 'c-1', senderId: 'u-1', content: 'Hello' });

      expect(result).toEqual(message);
      expect(mockMessageRepo.createMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMessages', () => {
    it('throws when user is not a member of the chat', async () => {
      mockMessageRepo.findChatMember.mockResolvedValue(null);

      await expect(service.getMessages('c-1', 'u-1')).rejects.toThrow('You are not a member of this chat');
    });

    it('returns cursor-based pagination result', async () => {
      const msg1 = { id: 'msg-3', content: 'C' };
      const msg2 = { id: 'msg-2', content: 'B' };
      mockMessageRepo.findChatMember.mockResolvedValue({ userId: 'u-1' });
      mockMessageRepo.findMessages.mockResolvedValue({ data: [msg1, msg2], nextCursor: '2026-01-01T00:00:00.000Z', hasMore: true });

      const result = await service.getMessages('c-1', 'u-1', undefined, 10);

      expect(result.data).toEqual([msg1, msg2]);
      expect(result.pagination).toMatchObject({ limit: 10, hasMore: true, nextCursor: '2026-01-01T00:00:00.000Z' });
    });
  });

  describe('editMessage', () => {
    it('throws when new content is empty', async () => {
      await expect(
        service.editMessage({ messageId: 'msg-1', userId: 'u-1', role: UserRoles.USER, newContent: '' }),
      ).rejects.toThrow('Message content cannot be empty');
    });

    it('throws when message does not exist', async () => {
      mockMessageRepo.findMessageById.mockResolvedValue(null);

      await expect(
        service.editMessage({ messageId: 'msg-1', userId: 'u-1', role: UserRoles.USER, newContent: 'Updated' }),
      ).rejects.toThrow('Message not found');
    });

    it('throws when user is not the message sender', async () => {
      mockMessageRepo.findMessageById.mockResolvedValue({
        id: 'msg-1',
        senderId: 'other-user',
        deletedAt: null,
      });

      await expect(
        service.editMessage({ messageId: 'msg-1', userId: 'u-1', role: UserRoles.USER, newContent: 'Updated' }),
      ).rejects.toThrow('You can only edit your own messages');
    });

    it('throws when trying to edit a deleted message', async () => {
      mockMessageRepo.findMessageById.mockResolvedValue({
        id: 'msg-1',
        senderId: 'u-1',
        deletedAt: new Date().toISOString(),
      });

      await expect(
        service.editMessage({ messageId: 'msg-1', userId: 'u-1', role: UserRoles.USER, newContent: 'Updated' }),
      ).rejects.toThrow('Cannot edit deleted message');
    });

    it('updates message content and returns updated message', async () => {
      const updatedMessage = { id: 'msg-1', content: 'Updated', senderId: 'u-1', attachments: [], type: 'TEXT' };
      mockMessageRepo.findMessageById.mockResolvedValue({ id: 'msg-1', senderId: 'u-1', deletedAt: null });
      mockMessageRepo.updateMessageContent.mockResolvedValue(updatedMessage);

      const result = await service.editMessage({
        messageId: 'msg-1',
        userId: 'u-1',
        role: UserRoles.USER,
        newContent: 'Updated',
      });

      expect(result).toEqual(updatedMessage);
      expect(mockMessageRepo.updateMessageContent).toHaveBeenCalledWith('msg-1', 'Updated');
    });
  });

  describe('deleteMessage', () => {
    it('throws when message does not exist', async () => {
      mockMessageRepo.findMessageWithSenderAndFiles.mockResolvedValue(null);

      await expect(service.deleteMessage('msg-1', 'u-1', UserRoles.USER)).rejects.toThrow('Message not found');
    });

    it('throws when user is not the message sender', async () => {
      mockMessageRepo.findMessageWithSenderAndFiles.mockResolvedValue({
        id: 'msg-1',
        senderId: 'other-user',
        attachments: [],
        chatId: 'c-1',
        deletedAt: null,
      });

      await expect(service.deleteMessage('msg-1', 'u-1', UserRoles.USER)).rejects.toThrow(
        'You can only delete your own messages',
      );
    });

    it('soft-deletes message and returns confirmation', async () => {
      mockMessageRepo.findMessageWithSenderAndFiles.mockResolvedValue({
        id: 'msg-1',
        senderId: 'u-1',
        attachments: [],
        chatId: 'c-1',
        deletedAt: null,
      });
      mockMessageRepo.softDeleteMessage.mockResolvedValue(undefined);

      const result = await service.deleteMessage('msg-1', 'u-1', UserRoles.USER);

      expect(result).toEqual({ message: 'Message deleted successfully' });
      expect(mockMessageRepo.softDeleteMessage).toHaveBeenCalledWith('msg-1');
      expect(mockSocketService.emitToRoom).toHaveBeenCalledWith(
        'chat',
        'chat:c-1',
        'message:deleted',
        expect.objectContaining({
          messageId: 'msg-1',
          chatId: 'c-1',
        }),
      );
    });
  });
});
