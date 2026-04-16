import { Controller, Get, Res, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { type Response } from 'express';
import { PublicRoute } from '../../common/decorators';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Keep metrics endpoint stable and unversioned at /metrics.
  @Get()
  @Version(VERSION_NEUTRAL)
  @PublicRoute()
  async getMetrics(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', this.metricsService.getContentType());
    response.send(await this.metricsService.getMetrics());
  }
}
