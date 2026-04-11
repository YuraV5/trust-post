import { ExceptionFilter, Catch, ArgumentsHost, Inject, HttpServer } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppErrorCode } from '../../../shared/errors/error-codes';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { Context } from '../../../shared/contex/context.service';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { MetricsService } from '../../metrics/metrics.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly adapterHost: HttpAdapterHost,
    private readonly metricsService: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter }: { httpAdapter: HttpServer } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = Context.get()?.requestId || 'no-rid';

    this.logger.error('Unhandled non-HTTP exception', {
      error: exception instanceof Error ? exception.stack || exception.message : String(exception),
      path: req.url,
      method: req.method,
    });

    // Count unhandled exceptions as 500 responses in HTTP metrics.
    this.metricsService.recordHttpRequest(req.method, this.metricsService.resolveRouteLabel(req), 500, 0);

    httpAdapter.reply(
      res,
      {
        requestId,
        statusCode: 500,
        error: AppErrorCode.INTERNAL,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
}
