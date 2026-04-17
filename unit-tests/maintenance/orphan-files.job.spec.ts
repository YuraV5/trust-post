import { ConfigService } from '@nestjs/config';
import { OrphanFilesJob } from '../../src/modules/maintenance/jobs/orphan-files.job';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { CloudinaryClient } from '../../src/modules/files/services/clients/cloudinary-client.service';

describe('OrphanFilesJob', () => {
  const prismaMock = {
    postFile: {
      findMany: jest.fn(),
    },
    chatFile: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const cloudinaryMock = {
    findOrphanCandidates: jest.fn(),
    delete: jest.fn(),
  } as unknown as CloudinaryClient;

  const configMock = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const loggerMock = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  let job: OrphanFilesJob;

  beforeEach(() => {
    jest.clearAllMocks();

    (configMock.get as jest.Mock).mockReturnValue('trust-post-service');
    (prismaMock.postFile.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.chatFile.findMany as jest.Mock).mockResolvedValue([]);
    (cloudinaryMock.findOrphanCandidates as jest.Mock).mockResolvedValue({
      resources: [],
      nextCursor: undefined,
    });
    (cloudinaryMock.delete as jest.Mock).mockResolvedValue(undefined);

    job = new OrphanFilesJob(
      prismaMock,
      cloudinaryMock,
      configMock,
      loggerMock as never,
    );
  });

  it('deletes orphan chat files when they are missing in message_files table', async () => {
    const existingChatKey = 'trust-post-service/user-1/chats/chat-1/exists';
    const orphanChatKey = 'trust-post-service/user-1/chats/chat-1/orphan';

    (cloudinaryMock.findOrphanCandidates as jest.Mock).mockResolvedValue({
      resources: [
        { public_id: existingChatKey, created_at: '2026-04-01T10:00:00.000Z' },
        { public_id: orphanChatKey, created_at: '2026-04-01T10:00:00.000Z' },
      ],
      nextCursor: undefined,
    });

    (prismaMock.chatFile.findMany as jest.Mock).mockResolvedValue([{ storageKey: existingChatKey }]);

    await job.handle();

    expect(prismaMock.chatFile.findMany).toHaveBeenCalledWith({
      where: { storageKey: { in: [existingChatKey, orphanChatKey] } },
      select: { storageKey: true },
    });

    expect(cloudinaryMock.delete).toHaveBeenCalledTimes(1);
    expect(cloudinaryMock.delete).toHaveBeenCalledWith([orphanChatKey]);
  });

  it('does not crash the scheduler when chat file lookup fails', async () => {
    (cloudinaryMock.findOrphanCandidates as jest.Mock).mockResolvedValue({
      resources: [{ public_id: 'trust-post-service/user-1/chats/chat-1/file', created_at: '2026-04-01T10:00:00.000Z' }],
      nextCursor: undefined,
    });

    (prismaMock.chatFile.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    await expect(job.handle()).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalled();
    expect(cloudinaryMock.delete).not.toHaveBeenCalled();
  });
});
