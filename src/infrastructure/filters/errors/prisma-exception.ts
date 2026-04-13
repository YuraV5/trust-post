import { ExceptionFilter, Catch, ArgumentsHost, Inject, HttpServer } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AppErrorCode } from '../../../shared/errors/error-codes';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { Context } from '../../../shared/contex/context.service';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { MetricsService } from '../../metrics/metrics.service';

type PrismaError = Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError;

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly adapterHost: HttpAdapterHost,
    private readonly metricsService: MetricsService,
  ) {}

  catch(exception: PrismaError, host: ArgumentsHost): void {
    const { httpAdapter }: { httpAdapter: HttpServer } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = Context.get()?.requestId || 'no-rid';

    this.handlePrismaError(exception, requestId, req, res, httpAdapter);
  }

  private handlePrismaError(
    error: PrismaError,
    requestId: string,
    req: Request,
    res: Response,
    httpAdapter: HttpServer,
  ): void {
    // Log the actual Prisma error with all details
    this.logger.error('Prisma database error', {
      error,
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      meta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
      path: req.url,
      method: req.method,
      context: 'PrismaError',
    });

    // Prisma validation errors happen before query execution and have no prisma code.
    if (error instanceof Prisma.PrismaClientValidationError) {
      // Track validation-related database failures as HTTP 400.
      this.metricsService.recordHttpRequest(req.method, this.metricsService.resolveRouteLabel(req), 400, 0);

      httpAdapter.reply(
        res,
        {
          requestId,
          statusCode: 400,
          error: AppErrorCode.BAD_REQUEST,
          message: 'Invalid database input',
          timestamp: new Date().toISOString(),
        },
        400,
      );
      return;
    }

    // Map Prisma known error codes to HTTP status and error codes
    let status = 500;
    let errorCode = AppErrorCode.INTERNAL;
    let message = 'Internal server error';

    switch (error.code) {
      case 'P2025': // Record not found
        status = 404;
        errorCode = AppErrorCode.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2002': // Unique constraint violation
        status = 409;
        errorCode = AppErrorCode.CONFLICT;
        message = 'Resource already exists';
        break;
      case 'P2014': // Relation constraint violation
        status = 400;
        errorCode = AppErrorCode.BAD_REQUEST;
        message = 'Invalid reference or relation';
        break;
      case 'P2003': // Foreign key constraint failure
        status = 400;
        errorCode = AppErrorCode.BAD_REQUEST;
        message = 'Invalid reference';
        break;
      case 'P2019': // Input error
        status = 400;
        errorCode = AppErrorCode.VALIDATION;
        message = 'Invalid input';
        break;
      case 'P2006': // Invalid value for field
      case 'P2007': // Data validation error
        status = 400;
        errorCode = AppErrorCode.BAD_REQUEST;
        message = 'Invalid database input';
        break;
    }

    // Track mapped Prisma errors with their resulting HTTP status.
    this.metricsService.recordHttpRequest(req.method, this.metricsService.resolveRouteLabel(req), status, 0);

    httpAdapter.reply(
      res,
      {
        requestId,
        statusCode: status,
        error: errorCode,
        message,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}
