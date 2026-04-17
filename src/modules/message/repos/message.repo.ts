import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IMessageRepo } from '../interfaces';
import {
  AddFileInput,
  ChatMemberEntity,
  MessageEntity,
  MessageFileEntity,
  MessageAttachmentCreateInput,
  MessageFileWithMessage,
  MessageRepoListResult,
  MessageWithSenderAndFiles,
} from '../types';
import { MessageStatus, MessageType } from '@prisma/client';

@Injectable()
export class MessageRepo implements IMessageRepo {
  constructor(private readonly db: PrismaService) {}

  async findChatMember(chatId: string, userId: string): Promise<ChatMemberEntity | null> {
    return this.db.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
  }

  async createMessage(input: {
    chatId: string;
    senderId: string;
    content: string | null;
    type: 'TEXT' | 'FILE' | 'MIXED' | 'SYSTEM';
    status: 'SENDING' | 'SENT' | 'FAILED';
    files?: MessageAttachmentCreateInput[];
  }): Promise<MessageWithSenderAndFiles> {
    const { chatId, senderId, content, type, status, files = [] } = input;

    return this.db.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          chatId,
          senderId,
          content,
          type: type as MessageType,
          status: status as MessageStatus,
          attachments: files.length
            ? {
                create: files,
              }
            : undefined,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
          attachments: true,
        },
      });

      await tx.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  }

  async touchChat(chatId: string): Promise<void> {
    await this.db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
  }

  async findMessages(chatId: string, cursor: Date | null, limit: number): Promise<MessageRepoListResult> {
    const data = await this.db.message.findMany({
      where: {
        chatId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: cursor } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    const hasMore = data.length > limit;
    const slice = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt.toISOString() : null;

    return { data: slice, nextCursor, hasMore };
  }

  async findMessageById(messageId: string): Promise<MessageEntity | null> {
    return this.db.message.findUnique({
      where: { id: messageId },
    });
  }

  async updateMessageContent(messageId: string, newContent: string): Promise<MessageWithSenderAndFiles> {
    return this.db.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        attachments: true,
      },
    });
  }

  async updateMessageType(
    messageId: string,
    type: 'TEXT' | 'FILE' | 'MIXED' | 'SYSTEM',
  ): Promise<MessageWithSenderAndFiles> {
    return this.db.message.update({
      where: { id: messageId },
      data: {
        type: type as MessageType,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        attachments: true,
      },
    });
  }

  async softDeleteMessage(messageId: string): Promise<void> {
    await this.db.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async createMessageFile(input: AddFileInput): Promise<MessageFileEntity> {
    return this.db.chatFile.create({
      data: input,
    });
  }

  async findFileById(fileId: string): Promise<MessageFileWithMessage | null> {
    return this.db.chatFile.findUnique({
      where: { id: fileId },
      include: {
        message: true,
      },
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.db.chatFile.delete({
      where: { id: fileId },
    });
  }

  async deleteFilesByMessageId(messageId: string): Promise<void> {
    await this.db.chatFile.deleteMany({
      where: { messageId },
    });
  }

  async findMessageWithSenderAndFiles(messageId: string): Promise<MessageWithSenderAndFiles | null> {
    return this.db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        attachments: true,
      },
    });
  }
}
