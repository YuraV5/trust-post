import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { UploadApiResponse } from 'cloudinary';
import { AppBadRequestException, AppConfigException } from '../../../../shared/errors/app-errors';
import { FileFolder, FileUploadResult, FileStorageInfo, FileUploadResponse } from '../../types';
import { type IAppLogger } from '../../../../shared/logger/intefaces/interface';
import { APP_LOGGER } from '../../../../shared/logger/services/app-logger';
import { ICloudinaryClient } from '../../interfaces/cloudinary';
import { executeWithRetry } from '../../../../common/utils/retry.util';
import { CONCURRENCY_LIMIT, MAX_RETRIES, RATE_LIMIT_DELAY_MS, RETRYABLE_STATUSES, TIMEOUT_MS } from '../../consts';
import { FileProvider } from '@prisma/client/wasm';

type ResourceType = 'auto' | 'image' | 'video' | 'raw';

@Injectable()
export class CloudinaryClientService implements ICloudinaryClient {
  private client: typeof cloudinary;
  private lastRequestTime = 0;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {}

  private getClient(): typeof cloudinary {
    if (!this.client) {
      const cloudName = this.config.get<string>('cloudinary.cloudName');
      const apiKey = this.config.get<string>('cloudinary.apiKey');
      const apiSecret = this.config.get<string>('cloudinary.apiSecret');

      if (!cloudName || !apiKey || !apiSecret) throw new AppConfigException('Cloudinary config missing');

      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.client = cloudinary;
    }

    return this.client;
  }

  async upload(
    files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[],
    data: FileStorageInfo,
    concurrency = CONCURRENCY_LIMIT,
  ): Promise<FileUploadResponse> {
    const uploaded: FileUploadResult[] = [];
    const failed: string[] = [];
    let index = 0;

    const runNext = async (): Promise<void> => {
      while (index < files.length) {
        const currentIndex = index++;
        const file = files[currentIndex];

        try {
          const result = await this.uploadSingle(file, data);
          uploaded[currentIndex] = result;
          this.logger.debug('Cloudinary upload successful', { file: file.originalname, url: result.url });
        } catch (error) {
          failed.push(file.originalname);
          this.logger.error('Cloudinary upload failed', {
            file: file.originalname,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    const runners = Array(Math.min(concurrency, files.length))
      .fill(0)
      .map(() => runNext());

    await Promise.all(runners);

    const uploadedFiltered = uploaded.filter(Boolean);
    if (!uploadedFiltered.length) {
      throw new AppBadRequestException('All file uploads failed');
    }

    return { data: uploadedFiltered, failed };
  }

  async delete(storageKeys: string[]): Promise<void> {
    const client = this.getClient();

    await this.applyRateLimit();

    await executeWithRetry(() => client.api.delete_resources(storageKeys), {
      maxRetries: MAX_RETRIES,
      timeoutMs: TIMEOUT_MS.delete,
      retryableStatuses: RETRYABLE_STATUSES,
    });
  }

  async deleteFolder(folder: string): Promise<void> {
    const client = this.getClient();
    await executeWithRetry(() => client.api.delete_resources_by_prefix(folder), {
      maxRetries: MAX_RETRIES,
      timeoutMs: TIMEOUT_MS.delete,
      retryableStatuses: RETRYABLE_STATUSES,
    });
  }

  async findOrphanCandidates(
    prefix: string,
    nextCursor?: string,
  ): Promise<{ resources: { public_id: string; created_at: string }[]; nextCursor?: string }> {
    const client = this.getClient();
    await this.applyRateLimit();

    const result = await executeWithRetry(
      async () => {
        let search = client.search
          // uploaded_at<1d means "uploaded more than 1 day ago"
          .expression(`folder:"${prefix}/*" AND uploaded_at<1d`)
          .max_results(500);

        if (nextCursor) {
          search = search.next_cursor(nextCursor);
        }

        return search.execute();
      },
      { maxRetries: MAX_RETRIES, timeoutMs: TIMEOUT_MS.delete, retryableStatuses: RETRYABLE_STATUSES },
    );

    return {
      resources: result.resources,
      nextCursor: result.next_cursor,
    };
  }

  private uploadStream(
    stream: NodeJS.ReadableStream,
    options: { folder: string; public_id: string; resource_type?: ResourceType },
  ): Promise<UploadApiResponse> {
    const client = this.getClient();

    return new Promise((resolve, reject) => {
      const upload = client.uploader.upload_stream(options, (err, res) => {
        if (err) return reject(err as Error);
        if (!res) return reject(new AppConfigException('Cloudinary returned empty response'));
        resolve(res);
      });

      stream.once('error', reject);
      stream.pipe(upload);
    });
  }

  private async uploadSingle(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    data: FileStorageInfo,
  ): Promise<FileUploadResult> {
    await this.applyRateLimit();

    const uploadResult = await executeWithRetry(
      async () => {
        const stream = Readable.from(file.buffer);
        return this.uploadStream(stream, {
          folder: this.constructFilePath(data.fileFolder, data.userId, String(data.resourceId)),
          public_id: `${Date.now()}_${randomUUID()}`,
          resource_type: 'auto',
        });
      },
      { maxRetries: MAX_RETRIES, timeoutMs: TIMEOUT_MS.upload, retryableStatuses: RETRYABLE_STATUSES },
    );

    return {
      url: uploadResult.secure_url,
      storageKey: uploadResult.public_id,
      size: uploadResult.bytes,
      originalName: file.originalname,
      mimeType: file.mimetype,
      provider: FileProvider.CLOUDINARY,
      metadata: {
        width: uploadResult.width || 0,
        height: uploadResult.height || 0,
        format: uploadResult.format || '',
      },
    };
  }

  private constructFilePath(type: FileFolder, userId: string, resourceId?: string): string {
    const appName = this.config.get<string>('serviceName') || 'trust-post';
    const base = `${appName}/${userId}/${type}`;
    if (type === FileFolder.AVATAR) return base;
    if (!resourceId) throw new AppBadRequestException(`${type} requires resourceId`);
    return `${base}/${resourceId}`;
  }

  // Rate limiting: ensures minimum delay between API requests
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }
}
