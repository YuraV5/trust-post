import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroupedPostFileKeysRow, NewFileRecordData } from '../types';
import { FileProvider, PostFile, Prisma } from '@prisma/client';

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

  async getGroupedFilesByPostId(postId: number): Promise<GroupedPostFileKeysRow[]> {
    return this.db.$queryRaw<GroupedPostFileKeysRow[]>(Prisma.sql`
      SELECT
        UPPER(provider::text) AS "provider",
        ARRAY_AGG(storage_key) AS "storageKeys"
      FROM post_files
      WHERE post_id = ${postId}
      GROUP BY provider
    `);
  }

  async getFilesByPostId(postId: number): Promise<{ url: string; storageKey: string; provider: FileProvider }[]> {
    const files = await this.db.postFile.findMany({
      where: { postId },
      select: { url: true, storageKey: true, provider: true },
    });
    return files;
  }

  async getPostFilesDetail(postId: number): Promise<PostFile[]> {
    return this.db.postFile.findMany({
      where: { postId },
      orderBy: [{ mainImage: 'desc' }, { createdAt: 'asc' }],
    });
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

  async getFileById(fileId: number): Promise<PostFile | null> {
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

  async countFilesByPostId(postId: number): Promise<number> {
    return this.db.postFile.count({
      where: { postId },
    });
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
