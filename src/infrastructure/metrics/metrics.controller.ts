import { Controller, Get, Res } from '@nestjs/common';
import { type Response } from 'express';
import { PublicRoute } from '../../common/decorators';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Serve Prometheus-compatible metrics at /metrics.
  @Get()
  @PublicRoute()
  async getMetrics(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', this.metricsService.getContentType());
    response.send(await this.metricsService.getMetrics());
  }
}
