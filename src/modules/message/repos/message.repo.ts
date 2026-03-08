import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IMessageRepo } from '../interfaces';
import {
  AddFileInput,
  ChatMemberEntity,
  MessageEntity,
  MessageFileEntity,
  MessageFileWithMessage,
  MessageRepoListResult,
  MessageWithSenderAndFiles,
} from '../types';

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

  async createMessage(chatId: string, senderId: string, content: string): Promise<MessageWithSenderAndFiles> {
    return this.db.message.create({
      data: {
        chatId,
        senderId,
        content,
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
        files: true,
      },
    });
  }

  async touchChat(chatId: string): Promise<void> {
    await this.db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
  }

  async findMessages(chatId: string, page: number, limit: number): Promise<MessageRepoListResult> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.message.findMany({
        where: {
          chatId,
          isDeleted: false,
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
          files: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.db.message.count({
        where: {
          chatId,
          isDeleted: false,
        },
      }),
    ]);

    return { data, total };
  }

  async findMessageById(messageId: string): Promise<MessageEntity | null> {
    return this.db.message.findUnique({
      where: { id: messageId },
    });
  }

  async updateMessageContent(messageId: string, newContent: string): Promise<MessageWithSenderAndFiles> {
    return this.db.message.update({
      where: { id: messageId },
      data: { content: newContent },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        files: true,
      },
    });
  }

  async softDeleteMessage(messageId: string): Promise<void> {
    await this.db.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  async createMessageFile(input: AddFileInput): Promise<MessageFileEntity> {
    return this.db.messageFile.create({
      data: input,
    });
  }

  async findFileById(fileId: string): Promise<MessageFileWithMessage | null> {
    return this.db.messageFile.findUnique({
      where: { id: fileId },
      include: {
        message: true,
      },
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.db.messageFile.delete({
      where: { id: fileId },
    });
  }
}
