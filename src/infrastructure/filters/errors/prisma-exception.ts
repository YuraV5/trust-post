import { ExceptionFilter, Catch, ArgumentsHost, Inject, HttpServer } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { Context } from '../../../shared/contex/context.service';

interface PrismaError extends Error {
  code?: string;
  meta?: unknown;
}

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly adapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (!this.isPrismaError(exception)) {
      throw exception; // Pass to next filter
    }

    const { httpAdapter }: { httpAdapter: HttpServer } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = Context.get()?.requestId || 'no-rid';

    this.handlePrismaError(exception as PrismaError, requestId, req, res, httpAdapter);
  }

  private isPrismaError(exception: unknown): boolean {
    if (!(exception instanceof Error)) {
      return false;
    }

    const error = exception as PrismaError;
    return (
      error.name === 'PrismaClientKnownRequestError' ||
      error.name === 'PrismaClientValidationError' ||
      error.name === 'PrismaClientRustPanicError' ||
      error.name === 'PrismaClientInitializationError' ||
      (error.code !== undefined && typeof error.code === 'string')
    );
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
      code: error.code,
      meta: error.meta,
      path: req.url,
      method: req.method,
      context: 'PrismaError',
    });

    // Map Prisma error codes to HTTP status and error codes
    let status = 500;
    let errorCode = ErrorCode.INTERNAL;
    let message = 'Internal server error';

    switch (error.code) {
      case 'P2025': // Record not found
        status = 404;
        errorCode = ErrorCode.NOT_FOUND;
        message = 'Record not found';
        break;
      case 'P2002': // Unique constraint violation
        status = 409;
        errorCode = ErrorCode.CONFLICT;
        message = 'Resource already exists';
        break;
      case 'P2014': // Relation constraint violation
        status = 400;
        errorCode = ErrorCode.BAD_REQUEST;
        message = 'Invalid reference or relation';
        break;
      case 'P2003': // Foreign key constraint failure
        status = 400;
        errorCode = ErrorCode.BAD_REQUEST;
        message = 'Invalid reference';
        break;
      case 'P2019': // Input error
        status = 400;
        errorCode = ErrorCode.VALIDATION;
        message = 'Invalid input';
        break;
    }

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
