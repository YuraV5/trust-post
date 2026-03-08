import { Injectable, Inject } from '@nestjs/common';
import { AppBadRequestException, AppNotFoundException, AppForbiddenException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { IMessageService } from '../interfaces';
import { AddFileInput, EditMessageInput, SendMessageInput } from '../types';
import { MessageRepo } from '../repos';

@Injectable()
export class MessageService implements IMessageService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: MessageRepo,
  ) {}

  async sendMessage(input: SendMessageInput) {
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

  async getMessages(chatId: string, userId: string, page: number = 1, limit: number = 50) {
    // Verify user is a member of the chat
    const member = await this.repo.findChatMember(chatId, userId);

    if (!member) {
      throw new AppForbiddenException('You are not a member of this chat');
    }

    const { data: messages, total } = await this.repo.findMessages(chatId, page, limit);

    return {
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async editMessage(input: EditMessageInput) {
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

  async deleteMessage(messageId: string, userId: string) {
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

  async addFiles(input: AddFileInput) {
    const { messageId, url, storageKey, provider, mimeType, size, originalName } = input;

    const message = await this.repo.findMessageById(messageId);

    if (!message) {
      throw new AppNotFoundException('Message not found');
    }

    if (message.isDeleted) {
      throw new AppBadRequestException('Cannot add files to deleted message');
    }

    const file = await this.repo.createMessageFile({
      messageId,
      url,
      storageKey,
      provider,
      mimeType,
      size,
      originalName,
    });

    this.logger.info('File added to message', { messageId, fileId: file.id });
    return file;
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.repo.findFileById(fileId);

    if (!file) {
      throw new AppNotFoundException('File not found');
    }

    if (file.message.senderId !== userId) {
      throw new AppForbiddenException('You can only delete files from your own messages');
    }

    await this.repo.deleteFile(fileId);

    this.logger.info('File deleted', { fileId, userId });
    return { message: 'File deleted successfully' };
  }

  async markAsRead(chatId: string, userId: string) {
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
}
