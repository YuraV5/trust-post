import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MessageService } from './services/message.service';
import { CurrentUser } from '../../common/decorators';
import { type AuthenticatedUser } from '../../common/interfaces';
import { SendMessageDto, EditMessageDto } from './dtos';
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageListResult> {
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
  ): Promise<MessageWithSenderAndFiles> {
    return this.messageService.sendMessage({
      chatId,
      senderId: user.userId,
      content: dto.content,
    });
  }

  @Post('chats/:chatId/messages/upload')
  @UseInterceptors(FilesInterceptor('files', 10)) // max 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send a message with files to a chat' })
  @ApiResponse({ status: 201, description: 'Message with files sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  async sendMessageWithFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('chatId') chatId: string,
    @Body('content') content: string,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(jpeg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats)/ })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB per file
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false, // Files are optional
        }),
    )
    files?: Express.Multer.File[],
  ): Promise<MessageWithSenderAndFiles> {
    return this.messageService.sendMessageWithFiles(chatId, user.userId, content, files);
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
    return this.messageService.deleteMessage(messageId, user.userId);
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
    return this.messageService.deleteFile(fileId, user.userId);
  }
}
