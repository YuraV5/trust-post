import {
  ParseEnumPipe,
  BadRequestException,
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
import { CleanupUploadedFilesDto, UploadFilesDto } from '../dtos';
import { FilesService } from '../services';
import { BadRequestErrorResponse, UnauthorizedErrorResponse } from '../../../common/swagger/responses';
import { FileUploadResponseDto } from '../dtos/doc.swagger';
import { resolveFileUploadConfig } from '../helpers/storage-config.helper';
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILES_PER_REQUEST,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_IMAGE_FILES_PER_REQUEST,
} from '../consts';

@ApiTags('files')
@ApiBearerAuth('JWT-auth')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete uploaded files by storage keys' })
  @ApiBody({ type: CleanupUploadedFilesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid storage keys or target scope',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async cleanupUploadedFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CleanupUploadedFilesDto,
  ): Promise<{ message: string }> {
    this.validateOwnershipScope(body.storageKeys, user.userId, body.target);
    await this.filesService.delete(body.storageKeys);
    return { message: `Deleted ${body.storageKeys.length} file(s)` };
  }

  @Post('/:target/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', MAX_IMAGE_FILES_PER_REQUEST)) // max 10 files
  @ApiOperation({ summary: 'Upload images (max 10, 6MB each)' })
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
        .addMaxSizeValidator({ maxSize: MAX_IMAGE_FILE_SIZE_BYTES })
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
  @UseInterceptors(FilesInterceptor('files', MAX_DOCUMENT_FILES_PER_REQUEST)) // max 5 files
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
        .addMaxSizeValidator({ maxSize: MAX_DOCUMENT_FILE_SIZE_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Express.Multer.File[],
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadFilesDto,
    @Param('target', new ParseEnumPipe(FileUploadTarget)) target: FileUploadTarget,
  ): Promise<FileUploadResponse> {
    return this.filesService.upload(files, { ...body, userId: user.userId, target });
  }

  private validateOwnershipScope(storageKeys: string[], userId: string, target: FileUploadTarget): void {
    const { pathSegment } = resolveFileUploadConfig(target);
    const expectedFragment = `/${userId}/${pathSegment}/`;

    const invalid = storageKeys.some((key) => {
      const normalized = key.replace(/\\/g, '/').trim();
      return !normalized.includes(expectedFragment);
    });

    if (invalid) {
      throw new BadRequestException('One or more storage keys do not belong to the current user and target scope');
    }
  }
}
