import { Controller, Get, Res, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { PublicRoute } from '../../common/decorators';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Keep metrics endpoint stable and unversioned at /metrics.
  @Get()
  @Version(VERSION_NEUTRAL)
  @PublicRoute()
  @ApiOperation({ summary: 'Prometheus metrics endpoint (text/plain)' })
  @ApiOkResponse({
    description: 'Prometheus exposition format payload',
    schema: {
      type: 'string',
      example:
        '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/health"} 12',
    },
  })
  async getMetrics(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', this.metricsService.getContentType());
    response.send(await this.metricsService.getMetrics());
  }
}
