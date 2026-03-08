import { Controller, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { PostFilesService } from '../services';

@Controller('admin/files')
export class AdminFilesController {
  constructor(private readonly postFilesService: PostFilesService) {}

  @Delete('/posts/:postId')
  async deleteAllPostFiles(@Param('postId', ParseIntPipe) postId: number) {
    return this.postFilesService.deleteFilesByPostId(postId);
  }

  @Delete('/:fileId')
  async forceDeleteFile(@Param('fileId', ParseIntPipe) fileId: number) {
    return this.postFilesService.deleteFileById(fileId);
  }
}
