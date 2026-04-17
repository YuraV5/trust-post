import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../../infrastructure/metrics/metrics.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class ActiveUsersMetricsJob implements OnModuleInit {
  private static readonly JOB_NAME = 'active-users-metrics';

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  // Initialize gauge immediately on boot so dashboards have data before first cron tick.
  async onModuleInit(): Promise<void> {
    await this.syncActiveUsersGauge();
  }

  // Refresh active users gauge every minute using active (not expired) sessions.
  @Cron('*/1 * * * *')
  async syncActiveUsersGauge(): Promise<void> {
    try {
      const activeUsers = await this.prisma.session.findMany({
        where: {
          expiresAt: { gt: new Date() },
        },
        distinct: ['userId'],
        select: { userId: true },
      });

      this.metricsService.setActiveUsers(activeUsers.length);

      this.logger.debug('Active users gauge synced', {
        job: ActiveUsersMetricsJob.JOB_NAME,
        activeUsers: activeUsers.length,
      });
    } catch (error) {
      this.logger.error('Failed to sync active users gauge', {
        job: ActiveUsersMetricsJob.JOB_NAME,
        error: error as Error,
      });
    }
  }
}
