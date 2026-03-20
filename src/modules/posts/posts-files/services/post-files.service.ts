import { Inject, Injectable } from '@nestjs/common';
import { PostFilesRepo } from '../repos';
import { FilesService } from '../../../files/services/files.service';
import { ResponseMessage } from '../../../../common/types';
import { NewFileRecordData } from '../types';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { FileProvider, PostFile } from '@prisma/client';

@Injectable()
export class PostFilesService {
  private readonly MAX_FILES_PER_POST = 10;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly postFilesRepo: PostFilesRepo,
    private readonly fileService: FilesService,
  ) {}

  async uploadFilesToPost(data: NewFileRecordData[]): Promise<ResponseMessage> {
    if (!data.length) {
      return { message: 'No files to upload' };
    }

    const postId = data[0].postId;
    if (!this.validateFileScope(data)) {
      this.logger.warn(`Upload rejected: File scope validation failed for post ${postId}`);
      return { message: 'Invalid file scope. Link only files uploaded by you for this post.' };
    }

    return this.postFilesRepo.withPostLock(postId, async (tx) => {
      const existingCount = await this.postFilesRepo.countFilesByPostId(postId, tx);
      const totalAfterUpload = existingCount + data.length;

      if (totalAfterUpload > this.MAX_FILES_PER_POST) {
        const exceededBy = totalAfterUpload - this.MAX_FILES_PER_POST;
        const maxCanUpload = this.MAX_FILES_PER_POST - existingCount;
        this.logger.warn(
          `Upload rejected: Post ${postId} would exceed ${this.MAX_FILES_PER_POST} files limit. Current: ${existingCount}, Attempted: ${data.length}`,
        );
        return {
          message: `Cannot upload ${data.length} files. Post has ${existingCount} files. Maximum is ${this.MAX_FILES_PER_POST}. Delete ${exceededBy} file(s) or upload only ${maxCanUpload} file(s).`,
        };
      }

      const hasExistingMain = await this.postFilesRepo.hasMainImage(postId, tx);
      const normalizedData = this.normalizeMainImageValues(data, hasExistingMain);

      const result = await this.postFilesRepo.insertMultipleFiles(normalizedData, tx);
      if (result.count === 0) {
        return { message: 'No new files were linked to the post (possible duplicates)' };
      }

      this.logger.debug(`${result.count} files uploaded and linked to post successfully`);
      return { message: 'Files uploaded and linked to post successfully' };
    });
  }

  async deleteFilesByPostId(postId: number): Promise<ResponseMessage> {
    const files = await this.postFilesRepo.getFilesByPostId(postId);

    if (!files.length) {
      this.logger.debug(`No files found for post ${postId}`);
      return { message: 'No files to delete' };
    }

    const deletionErrors: string[] = [];
    const successfullyDeletedKeys: string[] = [];

    if (files.length === 1) {
      const file = files[0];
      try {
        await this.fileService.delete([file.storageKey], file.provider);
        successfullyDeletedKeys.push(file.storageKey);
        this.logger.debug(`Deleted 1 file from ${file.provider} for post ${postId}`);
      } catch (error: unknown) {
        const errorMessage = `Failed to delete file from ${file.provider}: ${this.getErrorMessage(error)}`;
        this.logger.error(errorMessage, {
          error: error instanceof Error ? error : String(error),
          postId,
          provider: file.provider,
          keys: [file.storageKey],
        });
        deletionErrors.push(errorMessage);
      }
    } else {
      const groupedFiles = this.groupFilesByProvider(files);
      const providers = Object.keys(groupedFiles) as FileProvider[];

      for (const provider of providers) {
        const keys = groupedFiles[provider];
        if (!keys || !keys.length) continue;

        try {
          await this.fileService.delete(keys, provider);
          successfullyDeletedKeys.push(...keys);
          this.logger.debug(`Deleted ${keys.length} files from ${provider} for post ${postId}`);
        } catch (error: unknown) {
          const errorMessage = `Failed to delete files from ${provider}: ${this.getErrorMessage(error)}`;
          this.logger.error(errorMessage, {
            error: error instanceof Error ? error : String(error),
            postId,
            provider,
            keys,
          });
          deletionErrors.push(errorMessage);
        }
      }
    }

    try {
      const result = await this.postFilesRepo.deleteFilesByPostIdAndStorageKeys(postId, successfullyDeletedKeys);
      this.logger.debug(`Deleted ${result.count} file records from database for post ${postId}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to delete file records from database for post ${postId}`, {
        error: error instanceof Error ? error : String(error),
        postId,
      });
      throw error;
    }

    if (deletionErrors.length > 0) {
      this.logger.warn(`Completed deletion with errors for post ${postId}: ${deletionErrors.join('; ')}`);
      return {
        message: `Files deleted with some errors. ${successfullyDeletedKeys.length} files removed from storage, some files remain for retry.`,
      };
    }

    return { message: `Successfully deleted ${successfullyDeletedKeys.length} files` };
  }

  async deleteFileById(fileId: number): Promise<ResponseMessage> {
    const file = await this.postFilesRepo.getFileById(fileId);

    if (!file) {
      this.logger.debug(`File with id ${fileId} not found`);
      return { message: 'File not found' };
    }

    try {
      await this.fileService.delete([file.storageKey], file.provider);
      this.logger.debug(`Deleted file ${file.storageKey} from ${file.provider}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to delete file from ${file.provider}: ${this.getErrorMessage(error)}`, {
        error: error instanceof Error ? error : String(error),
        fileId,
        storageKey: file.storageKey,
      });
      return { message: 'Failed to delete file from storage. Record kept for retry.' };
    }

    try {
      await this.postFilesRepo.deleteFileById(fileId);
      this.logger.debug(`Deleted file record ${fileId} from database`);
    } catch (error: unknown) {
      this.logger.error(`Failed to delete file record ${fileId} from database`, {
        error: error instanceof Error ? error : String(error),
        fileId,
      });
      throw error;
    }

    return { message: 'File deleted successfully' };
  }

  async setMainImage(postId: number, fileId: number): Promise<ResponseMessage> {
    const updated = await this.postFilesRepo.setFileAsMainImage(postId, fileId);

    if (!updated) {
      return { message: 'File not found for the provided post' };
    }

    this.logger.debug(`Set file ${fileId} as main image for post ${postId}`);
    return { message: 'Main image updated successfully' };
  }

  async getPostFiles(postId: number): Promise<PostFile[]> {
    return this.postFilesRepo.getPostFilesDetail(postId);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private validateFileScope(data: NewFileRecordData[]): boolean {
    const first = data[0];
    if (!first) return false;

    const expectedPathFragment = `/${first.uploadedById}/posts/${first.postId}/`;

    return data.every((file) => {
      if (file.postId !== first.postId || file.uploadedById !== first.uploadedById) {
        return false;
      }

      if (file.provider !== FileProvider.CLOUDINARY) {
        return false;
      }

      const normalizedStorageKey = file.storageKey.replace(/\\/g, '/');
      return normalizedStorageKey.includes(expectedPathFragment);
    });
  }

  private groupFilesByProvider(
    files: { storageKey: string; provider: FileProvider }[],
  ): Partial<Record<FileProvider, string[]>> {
    const grouped: Partial<Record<FileProvider, string[]>> = {};

    for (const file of files) {
      if (!Object.values(FileProvider).includes(file.provider)) {
        this.logger.warn(`Skipping unknown file provider "${file.provider}"`);
        continue;
      }

      if (!grouped[file.provider]) grouped[file.provider] = [];
      grouped[file.provider]!.push(file.storageKey);
    }

    return grouped;
  }

  private normalizeMainImageValues(
    data: NewFileRecordData[],
    hasExistingMain: boolean,
  ): Array<NewFileRecordData & { mainImage: boolean }> {
    const normalized = data.map((file) => ({
      ...file,
      mainImage: Boolean(file.mainImage),
    }));

    // If there's already a main image, we can't have another one - all new files will be added with main=false
    if (hasExistingMain) {
      return normalized.map((file) => ({
        ...file,
        mainImage: false,
      }));
    }

    // Within a single batch, only one main=true is allowed
    let mainAssigned = false;
    for (const file of normalized) {
      if (file.mainImage && !mainAssigned) {
        mainAssigned = true;
        continue;
      }

      if (file.mainImage && mainAssigned) {
        file.mainImage = false;
      }
    }

    // If main is not provided - make the first file the main one
    if (!mainAssigned && normalized.length > 0) normalized[0].mainImage = true;

    return normalized;
  }
}
