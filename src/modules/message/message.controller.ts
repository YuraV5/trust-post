import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MessageService } from './services/message.service';
import { CurrentUser, RequireIdempotencyKey } from '../../common/decorators';
import { type AuthenticatedUser } from '../../common/interfaces';
import { EditMessageDto, SendMessageDto } from './dtos';
import { MessageActionResult, MessageListResult, MessageWithSenderAndFiles } from './types';

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
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageListResult> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.messageService.getMessages(chatId, user.userId, cursor, limitNum);
  }

  @Post('chats/:chatId/messages')
  @RequireIdempotencyKey()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a chat message with optional attachments (single message entity)' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @ApiResponse({ status: 400, description: 'Message must contain text or files' })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  async createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<MessageWithSenderAndFiles> {
    return this.messageService.sendMessage({
      chatId,
      senderId: user.userId,
      content: dto?.content,
      files,
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
  ): Promise<MessageWithSenderAndFiles> {
    return this.messageService.editMessage({
      messageId,
      userId: user.userId,
      role: user.role,
      newContent: dto.newContent,
    });
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Can only delete your own messages' })
  async deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
  ): Promise<MessageActionResult> {
    return this.messageService.deleteMessage(messageId, user.userId, user.role);
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete a file from a message' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Can only delete files from your own messages' })
  async deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
  ): Promise<MessageActionResult> {
    return this.messageService.deleteFile(fileId, user.userId, user.role);
  }
}
