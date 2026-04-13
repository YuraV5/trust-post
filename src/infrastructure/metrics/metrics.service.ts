import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

type HttpMetricLabels = 'method' | 'route' | 'status_code';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  // HTTP metrics.
  private readonly httpRequestsTotal: Counter<HttpMetricLabels>;
  private readonly httpRequestDuration: Histogram<HttpMetricLabels>;
  private readonly http5xxTotal: Counter<HttpMetricLabels>;

  // Business metrics.
  private readonly activeUsersGauge: Gauge<string>;
  private readonly postsTotal: Counter<string>;
  private readonly postsCurrentTotalGauge: Gauge<string>;
  private readonly postsByStatusGauge: Gauge<string>;
  private readonly postsPendingModerationGauge: Gauge<string>;
  private readonly chatsTotal: Counter<string>;
  private readonly commentsTotal: Counter<string>;
  private readonly likesTotal: Counter<string>;

  constructor() {
    // Register Node.js process/runtime metrics (cpu, memory, event loop, etc.).
    collectDefaultMetrics({ register: this.registry });

    // HTTP metrics - standard REST API observability.
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of processed HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.http5xxTotal = new Counter({
      name: 'http_5xx_total',
      help: 'Total number of HTTP responses with 5xx status code',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Business metrics - KPI tracking for platform user activity & content.
    this.activeUsersGauge = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users (logged in / last seen within 15min)',
      registers: [this.registry],
    });

    this.postsTotal = new Counter({
      name: 'posts_total',
      help: 'Total number of posts created on the platform',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.postsCurrentTotalGauge = new Gauge({
      name: 'posts_current_total',
      help: 'Current total number of non-deleted posts',
      registers: [this.registry],
    });

    this.postsByStatusGauge = new Gauge({
      name: 'posts_current_by_status',
      help: 'Current number of non-deleted posts grouped by status',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.postsPendingModerationGauge = new Gauge({
      name: 'posts_pending_moderation_current',
      help: 'Current number of posts waiting for moderation',
      registers: [this.registry],
    });

    this.chatsTotal = new Counter({
      name: 'chats_total',
      help: 'Total number of chat conversations created',
      registers: [this.registry],
    });

    this.commentsTotal = new Counter({
      name: 'comments_total',
      help: 'Total number of comments made on posts',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.likesTotal = new Counter({
      name: 'likes_total',
      help: 'Total number of likes/reactions across all content',
      labelNames: ['content_type'],
      registers: [this.registry],
    });
  }

  // Expose Prometheus text payload for the /metrics endpoint.
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Return the registry content type required by Prometheus scrapers.
  getContentType(): string {
    return this.registry.contentType;
  }

  // Build low-cardinality route labels using route templates when available.
  resolveRouteLabel(req: Request): string {
    const route = req.route as { path?: string } | undefined;
    const routePath = route?.path;

    if (routePath) {
      const withBase = `${req.baseUrl || ''}${routePath}`;
      return this.normalizePath(withBase);
    }

    return '/unmatched';
  }

  // Record counters and histogram for every completed HTTP request.
  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const labels = {
      method: method.toUpperCase(),
      route: this.normalizePath(route),
      status_code: String(statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);

    if (statusCode >= 500) {
      this.http5xxTotal.inc(labels);
    }
  }

  // Business metrics recording methods.
  // Call these from relevant services (UserService, PostService, ChatService, etc.)

  // Set the current count of active users. Call periodically (e.g., every 30s) from a scheduled job.
  setActiveUsers(count: number): void {
    this.activeUsersGauge.set(count);
  }

  // Increment post counter when a new post is created.
  recordPostCreated(status: 'published' | 'draft' | 'deleted' = 'published'): void {
    this.postsTotal.inc({ status });
  }

  // Set current total number of posts (snapshot metric).
  setCurrentPostsTotal(count: number): void {
    this.postsCurrentTotalGauge.set(count);
  }

  // Set current number of posts for a concrete status.
  setCurrentPostsByStatus(status: string, count: number): void {
    this.postsByStatusGauge.set({ status }, count);
  }

  // Set current number of posts that are waiting for moderation.
  setCurrentPostsPendingModeration(count: number): void {
    this.postsPendingModerationGauge.set(count);
  }

  // Increment chat counter when a new chat is created.
  recordChatCreated(): void {
    this.chatsTotal.inc();
  }

  // Increment comment counter when a new comment is posted.
  recordCommentCreated(status: 'posted' | 'deleted' = 'posted'): void {
    this.commentsTotal.inc({ status });
  }

  // Increment likes counter when a like/reaction is added.
  recordLikeAdded(contentType: 'post' | 'comment' | 'profile' = 'post'): void {
    this.likesTotal.inc({ content_type: contentType });
  }

  // Normalize path values to avoid noisy labels in Prometheus.
  private normalizePath(path: string): string {
    if (!path) {
      return '/unmatched';
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized.replace(/\/\/+/, '/');
  }
}
