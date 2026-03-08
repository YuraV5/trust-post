import { Controller, Post, Get, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './services/message.service';
import { CurrentUser } from '../../common/decorators';
import { type AuthenticatedUser } from '../../common/interfaces';
import { SendMessageDto, EditMessageDto, AddFileDto } from './dtos';

@ApiTags('messages')
@ApiBearerAuth('JWT-auth')
@Controller()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('chats/:chatId/messages')
  @ApiOperation({ summary: 'Get messages from a chat' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.messageService.getMessages(chatId, user.userId, pageNum, limitNum);
  }

  @Post('chats/:chatId/messages')
  @ApiOperation({ summary: 'Send a message to a chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage({
      chatId,
      senderId: user.userId,
      content: dto.content,
    });
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Can only edit your own messages' })
  async editMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messageService.editMessage({
      messageId,
      userId: user.userId,
      newContent: dto.newContent,
    });
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Can only delete your own messages' })
  async deleteMessage(@CurrentUser() user: AuthenticatedUser, @Param('messageId') messageId: string) {
    return this.messageService.deleteMessage(messageId, user.userId);
  }

  @Post('messages/:messageId/files')
  @ApiOperation({ summary: 'Add file to a message' })
  @ApiResponse({ status: 201, description: 'File added successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async addFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: AddFileDto,
  ) {
    return this.messageService.addFiles({
      messageId,
      url: dto.url,
      storageKey: dto.storageKey,
      provider: dto.provider,
      mimeType: dto.mimeType,
      size: dto.size,
      originalName: dto.originalName,
    });
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete a file from a message' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Can only delete files from your own messages' })
  async deleteFile(@CurrentUser() user: AuthenticatedUser, @Param('fileId') fileId: string) {
    return this.messageService.deleteFile(fileId, user.userId);
  }
}
