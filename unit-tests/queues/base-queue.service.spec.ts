import { BaseQueueService } from '../../src/modules/queues/base-queue.service';

describe('BaseQueueService', () => {
  const loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  const queueMock = {
    name: 'test-queue',
    add: jest.fn(),
  };

  class TestQueueService extends BaseQueueService {
    constructor(logger: any, queue: any) {
      super(logger, queue);
    }

    // Expose add for testing as public API from base class
    async enqueue(jobName: string, data: unknown, options?: any): Promise<void> {
      return this.add(jobName, data, options);
    }
  }

  let service: TestQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestQueueService(loggerMock as any, queueMock as any);
  });

  it('returns queue name', () => {
    expect(service.getQueueName()).toBe('test-queue');
  });

  describe('add', () => {
    it('adds job with merged default and custom options', async () => {
      queueMock.add.mockResolvedValue(undefined);

      await service.enqueue('job-1', { x: 1 }, { priority: 2 });

      expect(queueMock.add).toHaveBeenCalledWith(
        'job-1',
        { x: 1 },
        expect.objectContaining({
          attempts: 5,
          removeOnComplete: true,
          removeOnFail: 50,
          priority: 2,
        }),
      );
      expect(loggerMock.info).toHaveBeenCalled();
    });

    it('throws when queue is not initialized', async () => {
      const serviceWithoutQueue = new TestQueueService(loggerMock as any, null as any);

      await expect(serviceWithoutQueue.enqueue('job-1', { x: 1 })).rejects.toThrow('Queue is not initialized');
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('throws when job data is empty', async () => {
      await expect(service.enqueue('job-1', null)).rejects.toThrow('Job data cannot be empty');
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('rethrows queue errors and logs failure', async () => {
      queueMock.add.mockRejectedValue(new Error('Queue down'));

      await expect(service.enqueue('job-1', { x: 1 })).rejects.toThrow('Queue down');
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
});
