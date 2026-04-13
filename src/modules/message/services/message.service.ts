import { Injectable, Inject } from '@nestjs/common';
import { FileProvider } from '@prisma/client';
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
import { FileFolder } from '../../files/types';
import { RedisService } from '../../cache/services';

@Injectable()
export class MessageService implements IMessageService {
  private readonly MESSAGE_LIST_CACHE_TTL_SECONDS = 15;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: MessageRepo,
    private readonly filesService: FilesService,
    private readonly redisService: RedisService,
  ) {}

  async sendMessage(input: SendMessageInput): Promise<MessageWithSenderAndFiles> {
    const { chatId, senderId, content } = input;

    if (!content || content.trim().length === 0) {
      throw new AppBadRequestException('Message content cannot be empty');
    }

    // Verify user is a member of the chat
    const member = await this.repo.findChatMember(chatId, senderId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    const message = await this.repo.createMessage(chatId, senderId, content);

    // Update chat's updatedAt timestamp
    await this.repo.touchChat(chatId);

    this.logger.info('Message sent', { messageId: message.id, chatId, senderId });
    return message;
  }

  async getMessages(chatId: string, userId: string, page: number = 1, limit: number = 50): Promise<MessageListResult> {
    const cacheKey = this.buildCacheKey('chat-messages', { chatId, userId, page, limit });
    const cached = await this.readCache<MessageListResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Verify user is a member of the chat
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    const { data: messages, total } = await this.repo.findMessages(chatId, page, limit);

    const result = {
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.writeCache(cacheKey, result, this.MESSAGE_LIST_CACHE_TTL_SECONDS);
    return result;
  }

  async editMessage(input: EditMessageInput): Promise<MessageWithSenderAndFiles> {
    const { messageId, userId, newContent } = input;

    if (!newContent || newContent.trim().length === 0) {
      throw new AppBadRequestException('Message content cannot be empty');
    }

    const message = await this.repo.findMessageById(messageId);

    if (!message) {
      throw new AppNotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new AppForbiddenException('You can only edit your own messages');
    }

    if (message.isDeleted) {
      throw new AppBadRequestException('Cannot edit deleted message');
    }

    const updatedMessage = await this.repo.updateMessageContent(messageId, newContent);

    this.logger.info('Message edited', { messageId, userId });
    return updatedMessage;
  }

  async deleteMessage(messageId: string, userId: string): Promise<MessageActionResult> {
    const message = await this.repo.findMessageById(messageId);

    if (!message) {
      throw new AppNotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new AppForbiddenException('You can only delete your own messages');
    }

    await this.repo.softDeleteMessage(messageId);

    this.logger.info('Message deleted', { messageId, userId });
    return { message: 'Message deleted successfully' };
  }

  async deleteFile(fileId: string, userId: string): Promise<MessageActionResult> {
    const file = await this.repo.findFileById(fileId);

    if (!file) {
      throw new AppNotFoundException('File not found');
    }

    if (file.message.senderId !== userId) {
      throw new AppForbiddenException('You can only delete files from your own messages');
    }

    // Delete from storage first
    try {
      await this.filesService.delete([file.storageKey], file.provider);
    } catch (error) {
      this.logger.error('Failed to delete file from storage', {
        fileId,
        storageKey: file.storageKey,
        error: error instanceof Error ? error : String(error),
      });
      // Continue with DB deletion even if storage deletion fails
    }

    // Delete from database
    await this.repo.deleteFile(fileId);

    this.logger.info('File deleted', { fileId, userId });
    return { message: 'File deleted successfully' };
  }

  async markAsRead(chatId: string, userId: string): Promise<MessageActionResult> {
    // Verify user is a member of the chat
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    // This is a placeholder - you might want to implement a read receipts table
    // For now, we'll just return success
    this.logger.info('Messages marked as read', { chatId, userId });
    return { message: 'Messages marked as read' };
  }

  async sendMessageWithFiles(
    chatId: string,
    senderId: string,
    content: string,
    files?: Express.Multer.File[],
  ): Promise<MessageWithSenderAndFiles> {
    if (!content || content.trim().length === 0) {
      throw new AppBadRequestException('Message content cannot be empty');
    }

    // Verify user is a member of the chat
    const member = await this.repo.findChatMember(chatId, senderId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    // Upload files to storage if provided
    let uploadedFiles: Array<{
      url: string;
      storageKey: string;
      size: number;
      originalName: string;
      mimeType: string;
      provider: FileProvider;
    }> = [];

    if (files && files.length > 0) {
      try {
        const uploadResult = await this.filesService.upload(files, {
          resourceId: chatId,
          userId: senderId,
          fileFolder: FileFolder.CHATS,
          storage: FileProvider.CLOUDINARY,
        });

        uploadedFiles = uploadResult.data.map((file) => ({
          url: file.url,
          storageKey: file.storageKey,
          size: file.size,
          originalName: file.originalName,
          mimeType: file.mimeType,
          provider: file.provider,
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

    // Create message with files in a transaction-like approach
    try {
      const message = await this.repo.createMessage(chatId, senderId, content);

      // Attach files to message
      if (uploadedFiles.length > 0) {
        await Promise.all(
          uploadedFiles.map((file) =>
            this.repo.createMessageFile({
              messageId: message.id,
              ...file,
            }),
          ),
        );

        // Refetch message with files included
        const messageWithFiles = await this.repo.findMessages(chatId, 1, 1);
        const createdMessage = messageWithFiles.data.find((m) => m.id === message.id);

        if (!createdMessage) {
          throw new AppNotFoundException('Message not found after creation');
        }

        // Update chat's updatedAt timestamp
        await this.repo.touchChat(chatId);

        this.logger.info('Message with files sent', {
          messageId: message.id,
          chatId,
          senderId,
          filesCount: uploadedFiles.length,
        });

        return createdMessage;
      }

      // Update chat's updatedAt timestamp
      await this.repo.touchChat(chatId);

      this.logger.info('Message sent', { messageId: message.id, chatId, senderId });
      return message;
    } catch (error) {
      // Cleanup uploaded files if message creation failed
      if (uploadedFiles.length > 0) {
        this.logger.error('Message creation failed, cleaning up uploaded files', {
          chatId,
          senderId,
          error: error instanceof Error ? error : String(error),
        });
        try {
          await this.filesService.delete(
            uploadedFiles.map((f) => f.storageKey),
            FileProvider.CLOUDINARY,
          );
        } catch (cleanupError) {
          this.logger.error('Failed to cleanup files after error', { cleanupError });
        }
      }
      throw error;
    }
  }

  private buildCacheKey(scope: string, payload: unknown): string {
    return `cache:message:${scope}:${JSON.stringify(payload)}`;
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
