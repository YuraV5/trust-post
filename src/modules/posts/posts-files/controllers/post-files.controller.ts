import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PostFilesService } from '../services';
import { LinkPostFilesDto } from '../dtos';
import { type AuthenticatedUser } from '../../../../common/interfaces';
import { resolveFileUploadConfig } from '../../../files/helpers/storage-config.helper';
import { FileUploadTarget } from '../../../files/types';
import { CurrentUser, PublicRoute } from '../../../../common/decorators';
import { OwnershipGuard } from '../../../../common/guards';
import { PostFile } from '@prisma/client';
import {
  MessageResponseDto,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
} from '../../../../common/swagger/responses';

@ApiTags('post-files')
@ApiBearerAuth('JWT-auth')
@Controller('posts')
export class PostFilesController {
  constructor(private readonly postFilesService: PostFilesService) {}

  @Post('/:postId/files/link')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OwnershipGuard({ model: 'post', paramKey: 'postId' }))
  @ApiOperation({ summary: 'Link files to post (owner only)' })
  @ApiParam({ name: 'postId', type: Number })
  @ApiBody({ type: LinkPostFilesDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Files linked to post successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post or file not found',
    type: NotFoundErrorResponse,
  })
  async linkFilesToPost(
    @Param('postId', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: LinkPostFilesDto,
  ): Promise<{ message: string }> {
    const { storage } = resolveFileUploadConfig(FileUploadTarget.POST);
    const data = body.files.map((file) => ({
      ...file,
      postId,
      uploadedById: user.userId,
      provider: storage,
    }));
    return this.postFilesService.uploadFilesToPost(data);
  }

  @Get('/:postId/files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all files for a post' })
  @ApiParam({ name: 'postId', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post files retrieved',
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
  async getPostFiles(@Param('postId', ParseIntPipe) postId: number): Promise<PostFile[]> {
    return this.postFilesService.getPostFiles(postId);
  }

  @Get('/:postId/files/public')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public files for approved post' })
  @ApiParam({ name: 'postId', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public post files retrieved',
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approved post not found',
    type: NotFoundErrorResponse,
  })
  async getPublicPostFiles(@Param('postId', ParseIntPipe) postId: number): Promise<PostFile[]> {
    return this.postFilesService.getPublicPostFiles(postId);
  }

  @UseGuards(OwnershipGuard({ model: 'postFile', paramKey: 'fileId' }))
  @Delete('/:postId/files/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file from post (owner only)' })
  @ApiParam({ name: 'postId', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File or post not found',
    type: NotFoundErrorResponse,
  })
  async deletePostFile(@Param('fileId', ParseIntPipe) fileId: number): Promise<{ message: string }> {
    return this.postFilesService.deleteFileById(fileId);
  }

  @UseGuards(OwnershipGuard({ model: 'post', paramKey: 'postId' }))
  @Patch('/:postId/files/:fileId/main')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set file as main image for post (owner only)' })
  @ApiParam({ name: 'postId', type: Number })
  @ApiParam({ name: 'fileId', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Main image set successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File or post not found',
    type: NotFoundErrorResponse,
  })
  async setMainImage(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ): Promise<{ message: string }> {
    return this.postFilesService.setMainImage(postId, fileId);
  }
}
