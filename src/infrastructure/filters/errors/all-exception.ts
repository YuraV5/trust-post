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
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly adapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter }: { httpAdapter: HttpServer } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = Context.get()?.requestId || 'no-rid';

    // Check if it's a Prisma error
    if (this.isPrismaError(exception)) {
      this.handlePrismaError(exception as PrismaError, requestId, req, res, httpAdapter);
    } else {
      this.handleGenericError(exception, requestId, req, res, httpAdapter);
    }
  }

  private isPrismaError(exception: unknown): boolean {
    if (!(exception instanceof Error)) {
      return false;
    }

    const error = exception as PrismaError;
    // Check for Prisma error indicators
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

    // Return a generic error message to the client
    // This prevents leaking database internals
    httpAdapter.reply(
      res,
      {
        requestId,
        statusCode: 500,
        error: ErrorCode.INTERNAL,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }

  private handleGenericError(
    exception: unknown,
    requestId: string,
    req: Request,
    res: Response,
    httpAdapter: HttpServer,
  ): void {
    this.logger.error('Unhandled exception', {
      error: exception instanceof Error ? exception : undefined,
      path: req.url,
      method: req.method,
    });

    httpAdapter.reply(
      res,
      {
        requestId,
        statusCode: 500,
        error: ErrorCode.INTERNAL,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
}
