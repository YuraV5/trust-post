import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PostFilesService } from '../services';
import { LinkPostFilesDto } from '../dtos';
import { type AuthenticatedUser } from '../../../../common/interfaces';
import { CurrentUser } from '../../../../common/decorators';
import { OwnershipGuard } from '../../../../common/guards';
import { PostFile } from '@prisma/client';

@Controller('posts')
export class PostFilesController {
  constructor(private readonly postFilesService: PostFilesService) {}

  @Post('/:postId/files/link')
  @UseGuards(OwnershipGuard({ model: 'post', paramKey: 'postId' }))
  async linkFilesToPost(
    @Param('postId', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: LinkPostFilesDto,
  ): Promise<{ message: string }> {
    const data = body.files.map((file) => ({
      ...file,
      postId,
      uploadedById: user.userId,
    }));
    return this.postFilesService.uploadFilesToPost(data);
  }

  @Get('/:postId/files')
  async getPostFiles(@Param('postId', ParseIntPipe) postId: number): Promise<PostFile[]> {
    return this.postFilesService.getPostFiles(postId);
  }

  @UseGuards(OwnershipGuard({ model: 'postFile', paramKey: 'fileId' }))
  @Delete('/:postId/files/:fileId')
  async deletePostFile(@Param('fileId', ParseIntPipe) fileId: number): Promise<{ message: string }> {
    return this.postFilesService.deleteFileById(fileId);
  }

  @UseGuards(OwnershipGuard({ model: 'post', paramKey: 'postId' }))
  @Patch('/:postId/files/:fileId/main')
  async setMainImage(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ): Promise<{ message: string }> {
    return this.postFilesService.setMainImage(postId, fileId);
  }
}
