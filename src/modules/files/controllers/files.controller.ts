import {
  ParseEnumPipe,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFiles,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { FileUploadResponse, FileUploadTarget } from '../types';
import { UploadFilesDto } from '../dtos';
import { FilesService } from '../services';
import {
  BadRequestErrorResponse,
  UnauthorizedErrorResponse,
} from '../../../common/swagger/responses';
import { FileUploadResponseDto } from '../dtos/doc.swagger';

@ApiTags('files')
@ApiBearerAuth('JWT-auth')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('/:target/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10)) // max 10 files
  @ApiOperation({ summary: 'Upload images (max 10, 5MB each)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'target', enum: FileUploadTarget, description: 'Upload target: post, chat or profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Image files (JPEG, PNG, GIF, WebP)',
        },
        resourceId: {
          type: 'number',
          description: 'Required for post and chat uploads',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Images uploaded successfully',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or size exceeded',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async uploadImages(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(jpeg|png|gif|webp)/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadFilesDto,
    @Param('target', new ParseEnumPipe(FileUploadTarget)) target: FileUploadTarget,
  ): Promise<FileUploadResponse> {
    return this.filesService.upload(files, { ...body, userId: user.userId, target });
  }

  @Post('/:target/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 5)) // max 5 files
  @ApiOperation({ summary: 'Upload documents (PDF, DOC, DOCX - max 5, 20MB each)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'target', enum: FileUploadTarget, description: 'Upload target: post, chat or profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Document files (PDF, DOC, DOCX)',
        },
        resourceId: {
          type: 'number',
          description: 'Required for post and chat uploads',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Documents uploaded successfully',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or size exceeded',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
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
    @Body() body: UploadFilesDto,
    @Param('target', new ParseEnumPipe(FileUploadTarget)) target: FileUploadTarget,
  ): Promise<FileUploadResponse> {
    return this.filesService.upload(files, { ...body, userId: user.userId, target });
  }
}
