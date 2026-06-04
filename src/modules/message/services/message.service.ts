import { Injectable, Inject } from '@nestjs/common';
import { ChatFileType, FileProvider, MessageStatus, MessageType, UserRoles } from '@prisma/client';
import { AppBadRequestException, AppNotFoundException, AppForbiddenException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { IMessageService } from '../interfaces';
import {
  EditMessageInput,
  MessageActionResult,
  MessageListResult,
  MessageWithSenderAndFiles,
  SendMessageInput,
} from '../types';
import { MessageRepo } from '../repos';
import { FilesService } from '../../files/services';
import { FileUploadTarget } from '../../files/types';
import { resolveFileUploadConfig } from '../../files/helpers/storage-config.helper';
import { RedisService } from '../../cache/services';
import { SocketService } from '../../socket/socket.service';

@Injectable()
export class MessageService implements IMessageService {
  private readonly MESSAGE_LIST_CACHE_TTL_SECONDS = 15;
  private readonly DEFAULT_LIMIT = 20;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: MessageRepo,
    private readonly filesService: FilesService,
    private readonly redisService: RedisService,
    private readonly socketService: SocketService,
  ) {}

  private isAdmin(role: UserRoles): boolean {
    return role === UserRoles.ADMIN;
  }

  private resolveFileType(mimeType: string): ChatFileType {
    if (mimeType.startsWith('image/')) {
      return ChatFileType.IMAGE;
    }

    if (mimeType.startsWith('video/')) {
      return ChatFileType.VIDEO;
    }

    return ChatFileType.DOC;
  }

  // Determines the message type from its content.
  // SYSTEM is reserved for automated messages (join/leave events etc.) and
  // always wins. Otherwise: text+files → MIXED, files only → FILE, text only → TEXT.
  private resolveMessageType(hasText: boolean, hasFiles: boolean, forcedType?: MessageType): MessageType {
    if (forcedType === MessageType.SYSTEM) {
      return MessageType.SYSTEM;
    }

    if (hasText && hasFiles) {
      return MessageType.MIXED;
    }

    if (hasFiles) {
      return MessageType.FILE;
    }

    return MessageType.TEXT;
  }

  async sendMessage(input: SendMessageInput): Promise<MessageWithSenderAndFiles> {
    const { chatId, senderId, content, files = [], status, type } = input;
    const trimmed = content?.trim() ?? '';
    const hasText = trimmed.length > 0;
    const hasFiles = files.length > 0;

    if (!hasText && !hasFiles) {
      throw new AppBadRequestException('Message must contain text or attachments');
    }

    const member = await this.repo.findChatMember(chatId, senderId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    const { storage: chatStorage } = resolveFileUploadConfig(FileUploadTarget.CHAT);

    let uploadedFiles: Array<{
      url: string;
      storageKey: string;
      size: number;
      originalName: string;
      mimeType: string;
      provider: FileProvider;
      fileType: ChatFileType;
    }> = [];

    if (hasFiles) {
      try {
        const uploadResult = await this.filesService.upload(files, {
          resourceId: chatId,
          userId: senderId,
          target: FileUploadTarget.CHAT,
        });

        uploadedFiles = uploadResult.data.map((file) => ({
          url: file.url,
          storageKey: file.storageKey,
          size: file.size,
          originalName: file.originalName,
          mimeType: file.mimeType,
          provider: chatStorage,
          fileType: this.resolveFileType(file.mimeType),
        }));
      } catch (error) {
        this.logger.error('Failed to upload files', {
          chatId,
          senderId,
          error: error instanceof Error ? error : String(error),
        });
        throw new AppBadRequestException('Failed to upload files');
      }
    }

    const messageType = this.resolveMessageType(hasText, hasFiles, type);

    try {
      const message = await this.repo.createMessage({
        chatId,
        senderId,
        content: hasText ? trimmed : null,
        type: messageType,
        status: status ?? MessageStatus.SENT,
        files: uploadedFiles.map((file) => ({
          fileType: file.fileType,
          url: file.url,
          storageKey: file.storageKey,
          size: file.size,
          originalName: file.originalName,
          mimeType: file.mimeType,
          provider: file.provider,
        })),
      });

      this.socketService.emitToRoom('chat', `chat:${chatId}`, 'message:new', {
        chatId,
        message,
      });
      // for new messages we can afford to invalidate the cache after responding to the client,
      // since the new message won't be visible in the list until the next fetch anyway.
      void this.invalidateMessageCache(chatId);

      this.logger.info('Message sent', {
        messageId: message.id,
        chatId,
        senderId,
        type: message.type,
        attachments: message.attachments.length,
      });
      return message;
    } catch (error) {
      // Files were already uploaded to Cloudinary before the DB write failed.
      // We must delete them now, otherwise they become orphans in storage.
      if (uploadedFiles.length > 0) {
        const keys = uploadedFiles.map((file) => file.storageKey);

        try {
          await this.filesService.delete(keys);
        } catch (cleanupError) {
          this.logger.error('Failed to cleanup files after message creation error', {
            chatId,
            senderId,
            keys,
            error: cleanupError instanceof Error ? cleanupError : String(cleanupError),
          });
        }
      }

      throw error;
    }
  }

  async getMessages(
    chatId: string,
    userId: string,
    cursor?: string,
    limit: number = this.DEFAULT_LIMIT,
  ): Promise<MessageListResult> {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : this.DEFAULT_LIMIT;
    // Cursor-based pagination: the client passes the createdAt of the oldest
    // visible message; we return the next batch older than that timestamp.
    // This is more stable than page/offset for a live feed where new messages
    // are constantly being inserted at the top.
    const cacheKey = this.buildMessageCacheKey(chatId, { userId, cursor: cursor ?? null, limit: safeLimit });
    const cached = await this.readCache<MessageListResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    let cursorDate: Date | null = null;
    if (cursor) {
      cursorDate = new Date(cursor);
      if (Number.isNaN(cursorDate.getTime())) {
        throw new AppBadRequestException('Invalid cursor');
      }
    }

    const result = await this.repo.findMessages(chatId, cursorDate, safeLimit);

    const response = {
      data: result.data,
      pagination: {
        limit: safeLimit,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };

    await this.writeCache(cacheKey, response, this.MESSAGE_LIST_CACHE_TTL_SECONDS);
    return response;
  }

  async editMessage(input: EditMessageInput): Promise<MessageWithSenderAndFiles> {
    const { messageId, userId, role, newContent } = input;

    if (!newContent || newContent.trim().length === 0) {
      throw new AppBadRequestException('Message content cannot be empty');
    }

    const message = await this.repo.findMessageById(messageId);

    if (!message) {
      throw new AppNotFoundException('Message not found');
    }

    if (message.senderId !== userId && !this.isAdmin(role)) {
      throw new AppForbiddenException('You can only edit your own messages');
    }

    if (message.deletedAt) {
      throw new AppBadRequestException('Cannot edit deleted message');
    }

    let updatedMessage = await this.repo.updateMessageContent(messageId, newContent.trim());

    if (updatedMessage.attachments.length > 0 && updatedMessage.type === MessageType.FILE) {
      updatedMessage = await this.repo.updateMessageType(updatedMessage.id, MessageType.MIXED);
    }

    this.socketService.emitToRoom('chat', `chat:${updatedMessage.chatId}`, 'message:edited', {
      chatId: updatedMessage.chatId,
      message: updatedMessage,
    });

    void this.invalidateMessageCache(updatedMessage.chatId);

    this.logger.info('Message edited', { messageId, userId });
    return updatedMessage;
  }

  async deleteMessage(messageId: string, userId: string, role: UserRoles): Promise<MessageActionResult> {
    const message = await this.repo.findMessageWithSenderAndFiles(messageId);

    if (!message) {
      throw new AppNotFoundException('Message not found');
    }

    if (message.senderId !== userId && !this.isAdmin(role)) {
      throw new AppForbiddenException('You can only delete your own messages');
    }

    if (message.deletedAt) {
      return { message: 'Message deleted successfully' };
    }

    const storageKeys = message.attachments.map((attachment) => attachment.storageKey).filter(Boolean);

    if (storageKeys.length > 0) {
      await this.filesService.delete(storageKeys);
      await this.repo.deleteFilesByMessageId(messageId);
    }

    await this.repo.softDeleteMessage(messageId);

    this.socketService.emitToRoom('chat', `chat:${message.chatId}`, 'message:deleted', {
      messageId,
      chatId: message.chatId,
      timestamp: new Date().toISOString(),
    });

    void this.invalidateMessageCache(message.chatId);

    this.logger.info('Message deleted', { messageId, userId });
    return { message: 'Message deleted successfully' };
  }

  async deleteFile(fileId: string, userId: string, role: UserRoles): Promise<MessageActionResult> {
    const file = await this.repo.findFileById(fileId);

    if (!file) {
      throw new AppNotFoundException('File not found');
    }

    if (file.message.senderId !== userId && !this.isAdmin(role)) {
      throw new AppForbiddenException('You can only delete files from your own messages');
    }

    if (file.message.deletedAt) {
      throw new AppBadRequestException('Cannot modify files of a deleted message');
    }

    await this.filesService.delete([file.storageKey]);

    await this.repo.deleteFile(fileId);

    // After deleting a file we need to re-evaluate the parent message:
    // - If it had no text and this was the last file → the message is now empty,
    //   so we soft-delete it and tell clients to remove it from the UI.
    // - If content or other files remain → we recalculate its type (TEXT/FILE/MIXED)
    //   and broadcast the updated message so clients re-render it correctly.
    const updatedMessage = await this.repo.findMessageWithSenderAndFiles(file.messageId);
    if (updatedMessage) {
      const hasText = (updatedMessage.content?.trim().length ?? 0) > 0;
      const hasFiles = updatedMessage.attachments.length > 0;

      if (!hasText && !hasFiles) {
        await this.repo.softDeleteMessage(updatedMessage.id);
        this.socketService.emitToRoom('chat', `chat:${updatedMessage.chatId}`, 'message:deleted', {
          messageId: updatedMessage.id,
          chatId: updatedMessage.chatId,
          timestamp: new Date().toISOString(),
        });
      } else {
        const nextType = this.resolveMessageType(hasText, hasFiles);
        const normalizedMessage =
          updatedMessage.type !== nextType
            ? await this.repo.updateMessageType(updatedMessage.id, nextType)
            : updatedMessage;

        this.socketService.emitToRoom('chat', `chat:${updatedMessage.chatId}`, 'message:edited', {
          chatId: updatedMessage.chatId,
          message: normalizedMessage,
        });
      }
    }

    void this.invalidateMessageCache(file.message.chatId);

    this.logger.info('File deleted', { fileId, userId });
    return { message: 'File deleted successfully' };
  }

  async markAsRead(chatId: string, userId: string): Promise<MessageActionResult> {
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    this.logger.info('Messages marked as read', { chatId, userId });
    return { message: 'Messages marked as read' };
  }

  // chatId is a separate path segment (not inside JSON) so we can invalidate
  // the entire chat's message cache with a single SCAN pattern:
  // cache:message:chat-messages:<chatId>:* — covers every cursor/limit combo.
  private buildMessageCacheKey(chatId: string, rest: unknown): string {
    return `cache:message:chat-messages:${chatId}:${JSON.stringify(rest)}`;
  }

  private buildCacheKey(scope: string, payload: unknown): string {
    return `cache:message:${scope}:${JSON.stringify(payload)}`;
  }

  // Deletes all cached pages for a chat after a write (send/edit/delete).
  // Called with void so callers don't wait — the response goes to the client
  // immediately and cache cleanup happens in the background.
  private async invalidateMessageCache(chatId: string): Promise<void> {
    try {
      await this.redisService.delByPattern(`cache:message:chat-messages:${chatId}:*`);
    } catch (error) {
      this.logger.error('Message cache invalidation failed', {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async readCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error('Message cache read failed', {
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
      this.logger.error('Message cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
