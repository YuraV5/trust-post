import { Controller, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { PostFilesService } from '../services';
import { ResponseMessage } from '../../../../common/types';

@Controller('admin/files')
export class AdminFilesController {
  constructor(private readonly postFilesService: PostFilesService) {}

  @Delete('/posts/:postId')
  async deleteAllPostFiles(@Param('postId', ParseIntPipe) postId: number): Promise<ResponseMessage> {
    return this.postFilesService.deleteFilesByPostId(postId);
  }

  @Delete('/:fileId')
  async forceDeleteFile(@Param('fileId', ParseIntPipe) fileId: number): Promise<ResponseMessage> {
    return this.postFilesService.deleteFileById(fileId);
  }
}
