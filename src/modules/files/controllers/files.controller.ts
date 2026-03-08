import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { type FileStorageInfo } from '../types';
import { DeleteFilesDto, UploadDocumentsDto } from '../dtos';
import { FilesService } from '../services';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('/images')
  @UseInterceptors(FilesInterceptor('files', 10)) // max 10 files
  async uploadImages(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(jpeg|png|gif|webp)/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: FileStorageInfo,
  ) {
    return this.filesService.upload(files, { ...body, userId: user.userId });
  }

  @Post('/documents')
  @UseInterceptors(FilesInterceptor('files', 5)) // max 5 files
  async uploadDocuments(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
        })
        .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadDocumentsDto,
  ) {
    return this.filesService.upload(files, { ...body, userId: user.userId });
  }

  @Delete('/delete')
  async deleteFiles(@Body() body: DeleteFilesDto) {
    return this.filesService.delete(body.keys, body.storage);
  }
}
