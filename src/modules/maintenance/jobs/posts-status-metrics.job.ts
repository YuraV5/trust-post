import { MetricsService } from "@app/infrastructure/metrics/metrics.service";
import { PrismaService } from "@app/modules/prisma/prisma.service";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PostStatus } from "@prisma/client";

@Injectable()
export class PostsStatusMetricsJob implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  // Initialize gauges immediately so Grafana panels show values right after boot.
  async onModuleInit(): Promise<void> {
    await this.syncPostsStatusMetrics();
  }

  // Refresh posts snapshots every minute: total, by status, and pending moderation.
  @Cron('*/1 * * * *')
  async syncPostsStatusMetrics(): Promise<void> {
    const [totalPosts, groupedByStatus] = await Promise.all([
      this.prisma.post.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.post.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    this.metricsService.setCurrentPostsTotal(totalPosts);

    // Reset all known statuses to zero to avoid stale values.
    for (const status of Object.values(PostStatus)) {
      this.metricsService.setCurrentPostsByStatus(status, 0);
    }

    for (const row of groupedByStatus) {
      this.metricsService.setCurrentPostsByStatus(row.status, row._count._all);
    }

    const pendingCount = groupedByStatus.find((row) => row.status === PostStatus.PENDING_REVIEW)?._count._all ?? 0;
    this.metricsService.setCurrentPostsPendingModeration(pendingCount);
  }
}
