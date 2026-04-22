import { FileProvider } from '@prisma/client';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { FileUploadTarget, type FileUploadConfig, type FileUploadRequest, type ResolvedFileStorageInfo } from '../types';

const STORAGE_BY_TARGET: Record<FileUploadTarget, FileUploadConfig> = {
  [FileUploadTarget.POST]: {
    storage: FileProvider.CLOUDINARY,
    pathSegment: 'posts',
    requiresResourceId: true,
  },
  [FileUploadTarget.CHAT]: {
    storage: FileProvider.CLOUDINARY,
    pathSegment: 'chat',
    requiresResourceId: true,
  },
  [FileUploadTarget.PROFILE]: {
    storage: FileProvider.CLOUDINARY,
    pathSegment: 'profile',
    requiresResourceId: false,
  },
};

export function resolveFileUploadConfig(target: FileUploadTarget): FileUploadConfig {
  const config = STORAGE_BY_TARGET[target];

  if (!config) {
    throw new AppBadRequestException(`Unsupported upload target: ${target}`);
  }

  return config;
}

export function resolveFileStorageInfo(data: FileUploadRequest): ResolvedFileStorageInfo {
  const config = resolveFileUploadConfig(data.target);
  const normalizedResourceId = data.resourceId === undefined || data.resourceId === null ? undefined : String(data.resourceId);

  if (config.requiresResourceId && !normalizedResourceId) {
    throw new AppBadRequestException(`resourceId is required for ${data.target} uploads`);
  }

  return {
    ...data,
    resourceId: normalizedResourceId,
    storage: config.storage,
    pathSegment: config.pathSegment,
    requiresResourceId: config.requiresResourceId,
  };
}
