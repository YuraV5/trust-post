import { Controller, Post, Get, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './services/chat.service';
import { CurrentUser } from '../../common/decorators';
import { type AuthenticatedUser } from '../../common/interfaces';
import { CreateChatDto } from './dtos/create-chat.dto';

@ApiTags('chats')
@ApiBearerAuth('JWT-auth')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat (private or group)' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createChat(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChatDto) {
    if (dto.type === 'PRIVATE') {
      if (dto.participantIds.length !== 1) {
        throw new Error('Private chat must have exactly one other participant');
      }
      return this.chatService.createPrivateChat({
        userId: user.userId,
        otherUserId: dto.participantIds[0],
      });
    } else {
      return this.chatService.createGroupChat({
        title: dto.title || 'Group Chat',
        creatorId: user.userId,
        participantIds: dto.participantIds,
      });
    }
  }

  @Post('posts/:postId/chat')
  @ApiOperation({ summary: 'Create or get chat for a specific post' })
  @ApiResponse({ status: 201, description: 'Post chat created or retrieved' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async createPostChat(@CurrentUser() user: AuthenticatedUser, @Param('postId', ParseIntPipe) postId: number) {
    return this.chatService.createPostChat({
      postId,
      creatorId: user.userId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all chats for current user' })
  @ApiResponse({ status: 200, description: 'List of chats' })
  async getUserChats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.chatService.getUserChats(user.userId, pageNum, limitNum);
  }

  @Get(':chatId')
  @ApiOperation({ summary: 'Get a specific chat by ID' })
  @ApiResponse({ status: 200, description: 'Chat details' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  async getChat(@CurrentUser() user: AuthenticatedUser, @Param('chatId') chatId: string) {
    return this.chatService.getChat(chatId, user.userId);
  }

  @Post(':chatId/join')
  @ApiOperation({ summary: 'Join a group chat' })
  @ApiResponse({ status: 200, description: 'Successfully joined the chat' })
  @ApiResponse({ status: 400, description: 'Cannot join private chat or already a member' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async joinChat(@CurrentUser() user: AuthenticatedUser, @Param('chatId') chatId: string) {
    return this.chatService.joinChat(chatId, user.userId);
  }

  @Post(':chatId/leave')
  @ApiOperation({ summary: 'Leave a chat' })
  @ApiResponse({ status: 200, description: 'Successfully left the chat' })
  @ApiResponse({ status: 404, description: 'Not a member of this chat' })
  async leaveChat(@CurrentUser() user: AuthenticatedUser, @Param('chatId') chatId: string) {
    return this.chatService.leaveChat(chatId, user.userId);
  }

  @Delete(':chatId')
  @ApiOperation({ summary: 'Delete chat for current user (removes user from chat)' })
  @ApiResponse({ status: 200, description: 'Chat deleted successfully' })
  @ApiResponse({ status: 404, description: 'Not a member of this chat' })
  async deleteChatForUser(@CurrentUser() user: AuthenticatedUser, @Param('chatId') chatId: string) {
    return this.chatService.deleteChatForUser(chatId, user.userId);
  }

  @Post(':chatId/read')
  @ApiOperation({ summary: 'Mark all messages in chat as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async markChatAsRead(@CurrentUser() user: AuthenticatedUser, @Param('chatId') chatId: string) {
    return this.chatService.markChatAsRead(chatId, user.userId);
  }
}
