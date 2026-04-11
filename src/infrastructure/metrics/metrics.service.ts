import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

type HttpMetricLabels = 'method' | 'route' | 'status_code';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestsTotal: Counter<HttpMetricLabels>;
  private readonly httpRequestDuration: Histogram<HttpMetricLabels>;
  private readonly http5xxTotal: Counter<HttpMetricLabels>;

  constructor() {
    // Register Node.js process/runtime metrics (cpu, memory, event loop, etc.).
    collectDefaultMetrics({ register: this.registry });

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

  // Normalize path values to avoid noisy labels in Prometheus.
  private normalizePath(path: string): string {
    if (!path) {
      return '/unmatched';
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized.replace(/\/\/+/, '/');
  }
}
