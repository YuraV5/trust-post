import { Injectable } from '@nestjs/common';
import { ChatType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
import { IChatRepo } from '../interfaces';

@Injectable()
export class ChatRepo implements IChatRepo {
  constructor(private readonly db: PrismaService) {}

  private normalizePrivatePair(userId: string, otherUserId: string): [string, string] {
    return userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  }

  async findPrivateChatBetweenUsers(userId: string, otherUserId: string): Promise<PrivateChatWithChat | null> {
    return this.db.privateChat.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId },
        ],
      },
      include: {
        chat: true,
      },
    });
  }

  async createPrivateChat(input: CreatePrivateChatInput): Promise<ChatWithMembers> {
    const { userId, otherUserId } = input;
    const [normalizedUser1Id, normalizedUser2Id] = this.normalizePrivatePair(userId, otherUserId);

    return this.db.chat.create({
      data: {
        type: ChatType.PRIVATE,
        PrivateChat: {
          create: {
            user1Id: normalizedUser1Id,
            user2Id: normalizedUser2Id,
          },
        },
        members: {
          createMany: {
            data: [{ userId }, { userId: otherUserId }],
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async createGroupChat(input: CreateGroupChatInput): Promise<ChatWithMembers> {
    const { title, creatorId, participantIds } = input;
    const allParticipants = Array.from(new Set([creatorId, ...participantIds]));

    return this.db.chat.create({
      data: {
        type: ChatType.GROUP,
        title,
        members: {
          createMany: {
            data: allParticipants.map((userId) => ({ userId })),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findPostById(postId: number): Promise<{ id: number; authorId: string } | null> {
    return this.db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    });
  }

  async findChatByTitle(title: string): Promise<ChatEntity | null> {
    return this.db.chat.findFirst({
      where: {
        title,
      },
    });
  }

  async findChatByPostId(postId: number): Promise<ChatWithMembers | null> {
    return this.db.chat.findUnique({
      where: {
        postId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async createPostChat(postId: number, authorId: string): Promise<ChatWithMembers> {
    return this.db.chat.create({
      data: {
        type: ChatType.POST,
        title: `Post #${postId} Chat`,
        postId,
        members: {
          create: {
            userId: authorId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findChatById(chatId: string): Promise<ChatEntity | null> {
    return this.db.chat.findUnique({
      where: { id: chatId },
    });
  }

  async findChatMember(
    chatId: string,
    userId: string,
    includeDeleted: boolean = false,
  ): Promise<ChatMemberEntity | null> {
    const where: Record<string, unknown> = {
      chatId,
      userId,
    };
    if (!includeDeleted) {
      where.isDelete = false;
    }

    return this.db.chatMember.findFirst({ where: where as any });
  }

  async addChatMember(chatId: string, userId: string): Promise<void> {
    await this.db.chatMember.upsert({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      create: {
        chatId,
        userId,
      },
      update: {
        isDelete: false,
        deletedAt: null,
      } as any,
    });
  }

  async removeChatMember(chatId: string, userId: string): Promise<void> {
    await this.db.chatMember.delete({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
  }

  async softDeleteChatMember(chatId: string, userId: string): Promise<void> {
    await this.db.chatMember.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        isDelete: true,
        deletedAt: new Date(),
      } as any,
    });
  }

  async findUserChats(userId: string, page: number, limit: number): Promise<ChatRepoUserChatsResult> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.chat.findMany({
        where: {
          members: {
            some: {
              userId,
              isDelete: false,
            } as any,
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  photoUrl: true,
                },
              },
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.db.chat.count({
        where: {
          members: {
            some: {
              userId,
              isDelete: false,
            } as any,
          },
        },
      }),
    ]);

    return { data, total };
  }

  async findChatWithMembers(chatId: string): Promise<ChatWithMembersAndPrivate | null> {
    return this.db.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          where: {
            isDelete: false,
          } as any,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        },
        PrivateChat: true,
      },
    });
  }
}
