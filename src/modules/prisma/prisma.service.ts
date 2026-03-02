import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { APP_LOGGER, AppLogger } from '../../shared/logger/services/app-logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  private connected = false;

  constructor(@Inject(APP_LOGGER) private readonly logger: AppLogger) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const RETRIES = 5;
    const RETRAY_DELAY = 2000;

    for (let i = 1; i <= RETRIES; i++) {
      try {
        await this.$connect();
        this.connected = true;
        this.logger.info('Database connected');
        return;
      } catch (e) {
        this.logger.error(`DB not ready (${i}/${RETRIES}), retrying...`, { error: e as Error });
        await new Promise((r) => setTimeout(r, RETRAY_DELAY));
      }
    }

    this.logger.error('Database connection failed after retries');
    process.exit(1);
  }

  async onApplicationShutdown(signal: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.$disconnect();
      this.logger.info(`Database disconnected. Signal: ${signal}`);
    } catch (e) {
      this.logger.error('Database disconnect failed', { error: e as Error });
    }
  }

  /**
   * Helper method for executing code within a transaction
   * Usage: await this.prisma.transaction(async (tx) => { ... })
   */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }
}
