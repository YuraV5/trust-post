import { Injectable } from '@nestjs/common';
import { ChatType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupChatInput, CreatePrivateChatInput } from '../types';
import { IChatRepo } from '../interfaces';

@Injectable()
export class ChatRepo implements IChatRepo {
  constructor(private readonly db: PrismaService) {}

  async findPrivateChatBetweenUsers(userId: string, otherUserId: string): Promise<any | null> {
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

  async createPrivateChat(input: CreatePrivateChatInput): Promise<any> {
    const { userId, otherUserId } = input;

    return this.db.chat.create({
      data: {
        type: ChatType.PRIVATE,
        PrivateChat: {
          create: {
            user1Id: userId,
            user2Id: otherUserId,
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

  async createGroupChat(input: CreateGroupChatInput): Promise<any> {
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

  async findChatByTitle(title: string): Promise<any | null> {
    return this.db.chat.findFirst({
      where: {
        title,
      },
    });
  }

  async findChatByPostId(postId: number): Promise<any | null> {
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

  async createPostChat(postId: number, authorId: string): Promise<any> {
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

  async findChatById(chatId: string): Promise<any | null> {
    return this.db.chat.findUnique({
      where: { id: chatId },
    });
  }

  async findChatMember(chatId: string, userId: string): Promise<any | null> {
    return this.db.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
  }

  async addChatMember(chatId: string, userId: string): Promise<void> {
    await this.db.chatMember.create({
      data: {
        chatId,
        userId,
      },
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

  async findUserChats(userId: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.chat.findMany({
        where: {
          members: {
            some: {
              userId,
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
            },
          },
        },
      }),
    ]);

    return { data, total };
  }

  async findChatWithMembers(chatId: string): Promise<any | null> {
    return this.db.chat.findUnique({
      where: { id: chatId },
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
        PrivateChat: true,
      },
    });
  }
}
