import { Controller, Delete, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PostFilesService } from '../services';
import { ResponseMessage } from '../../../../common/types';
import {
  MessageResponseDto,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
} from '../../../../common/swagger/responses';
import { UserRoles } from '@prisma/client';
import { Roles } from '../../../../common/decorators';

@ApiTags('admin-files')
@ApiBearerAuth('JWT-auth')
@Controller('admin/files')
export class AdminFilesController {
  constructor(private readonly postFilesService: PostFilesService) {}

  @Delete('/posts/:postId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRoles.ADMIN)
  @ApiOperation({ summary: 'Delete all files for a post (Admin only)' })
  @ApiParam({ name: 'postId', type: Number, description: 'Post ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All post files deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token / Insufficient permissions',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
  async deleteAllPostFiles(@Param('postId', ParseIntPipe) postId: number): Promise<ResponseMessage> {
    return this.postFilesService.deleteFilesByPostId(postId);
  }

  @Delete('/:fileId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRoles.ADMIN)
  @ApiOperation({ summary: 'Permanently delete specific file (Admin only)' })
  @ApiParam({ name: 'fileId', type: Number, description: 'File ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token / Insufficient permissions',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
    type: NotFoundErrorResponse,
  })
  async forceDeleteFile(@Param('fileId', ParseIntPipe) fileId: number): Promise<ResponseMessage> {
    return this.postFilesService.deleteFileById(fileId);
  }
}
