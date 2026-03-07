import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NewFileRecordData } from '../types';
import { FileProvider } from '@prisma/client';

@Injectable()
export class PostFilesRepo {
  constructor(private readonly db: PrismaService) {}

  async insertMultipleFiles(data: NewFileRecordData[]): Promise<{ count: number }> {
    const result = await this.db.postFile.createMany({
      data,
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async getGroupedFilesByPostId(postId: number): Promise<Partial<Record<FileProvider, string[]>>> {
    const files = await this.db.postFile.findMany({
      where: { postId },
      select: { provider: true, storageKey: true },
    });

    const grouped: Partial<Record<FileProvider, string[]>> = {};
    for (const file of files) {
      if (!grouped[file.provider]) {
        grouped[file.provider] = [];
      }
      grouped[file.provider]!.push(file.storageKey);
    }

    return grouped;
  }

  async getFilesByPostId(postId: number): Promise<{ url: string; storageKey: string; provider: FileProvider }[]> {
    const files = await this.db.postFile.findMany({
      where: { postId },
      select: { url: true, storageKey: true, provider: true },
    });
    return files;
  }

  async deleteFilesByPostId(postId: number): Promise<{ count: number }> {
    const result = await this.db.postFile.deleteMany({
      where: { postId },
    });

    return { count: result.count };
  }

  async deleteFilesByPostIdAndStorageKeys(postId: number, storageKeys: string[]): Promise<{ count: number }> {
    if (!storageKeys.length) return { count: 0 };

    const result = await this.db.postFile.deleteMany({
      where: {
        postId,
        storageKey: { in: storageKeys },
      },
    });

    return { count: result.count };
  }

  async getFileById(fileId: number) {
    return this.db.postFile.findUnique({
      where: { id: fileId },
    });
  }

  async deleteFileById(fileId: number): Promise<{ count: number }> {
    const result = await this.db.postFile.deleteMany({
      where: { id: fileId },
    });

    return { count: result.count };
  }

  async hasMainImage(postId: number): Promise<boolean> {
    const existing = await this.db.postFile.findFirst({
      where: { postId, mainImage: true },
      select: { id: true },
    });

    return Boolean(existing);
  }

  async setFileAsMainImage(postId: number, fileId: number): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const target = await tx.postFile.findFirst({
        where: { id: fileId, postId },
        select: { id: true, mainImage: true },
      });

      if (!target) return false;
      if (target.mainImage) return true;

      await tx.postFile.updateMany({
        where: { postId, mainImage: true },
        data: { mainImage: false },
      });

      await tx.postFile.update({
        where: { id: target.id },
        data: { mainImage: true },
      });

      return true;
    });
  }
}
