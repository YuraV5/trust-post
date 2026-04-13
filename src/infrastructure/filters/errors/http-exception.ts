import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { Context } from '../../../shared/contex/context.service';
import { AppError } from '../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../shared/errors/error-codes';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { MetricsService } from '../../metrics/metrics.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly adapterHost: HttpAdapterHost,
    private readonly metricsService: MetricsService,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = Context.get()?.requestId || 'no-rid';

    let status = exception.getStatus();
    let code = AppErrorCode.INTERNAL;
    let message = exception.message;
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof BadRequestException) {
      code = AppErrorCode.VALIDATION;
      const r = exception.getResponse() as { message?: string | string[] };

      if (Array.isArray(r.message)) {
        message = 'Validation failed';
        details = r.message;
      } else {
        message = r.message ?? 'Validation failed';
      }
    } else if (exception instanceof NotFoundException) {
      status = 404;
      code = AppErrorCode.NOT_FOUND;
      message = 'Resource not found';
    }

    this.logger.error('HTTP exception occurred', {
      requestId,
      status,
      code,
      message,
      details,
      path: req.url,
      method: req.method,
      stack: exception instanceof Error ? exception.stack : undefined,
      context: 'HttpExceptionFilter',
    });

    // Record exception response metrics with the mapped final status code.
    this.metricsService.recordHttpRequest(req.method, this.metricsService.resolveRouteLabel(req), status, 0);

    httpAdapter.reply(
      res,
      {
        requestId,
        statusCode: status,
        error: code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}
