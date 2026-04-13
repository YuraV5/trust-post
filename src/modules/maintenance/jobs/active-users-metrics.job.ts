import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../../infrastructure/metrics/metrics.service';

@Injectable()
export class ActiveUsersMetricsJob implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  // Initialize gauge immediately on boot so dashboards have data before first cron tick.
  async onModuleInit(): Promise<void> {
    await this.syncActiveUsersGauge();
  }

  // Refresh active users gauge every minute using active (not expired) sessions.
  @Cron('*/1 * * * *')
  async syncActiveUsersGauge(): Promise<void> {
    const activeUsers = await this.prisma.session.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    this.metricsService.setActiveUsers(activeUsers.length);
  }
}

