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
import { CurrentUser } from '../../common/decorators';
import { type AuthenticatedUser } from '../../common/interfaces';
import { EditMessageDto } from './dtos';
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

  @Post('chats/:chatId/messages/:messageId/files')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Attach files to an existing message (own messages only, max 10 files)' })
  @ApiResponse({ status: 200, description: 'Files attached successfully' })
  @ApiResponse({ status: 400, description: 'No files provided or message is deleted' })
  @ApiResponse({ status: 403, description: 'Can only attach files to your own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async addFilesToMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<MessageActionResult> {
    if (!files || files.length === 0) {
      return { message: 'No files provided' };
    }
    await this.messageService.addFilesToMessage(messageId, user.userId, user.role, files);
    return { message: 'Files attached successfully' };
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
