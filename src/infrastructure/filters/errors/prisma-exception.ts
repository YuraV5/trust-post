import { ExceptionFilter, Catch, ArgumentsHost, Inject, HttpServer } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { AppErrorCode } from '../../../shared/errors/error-codes';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { Context } from '../../../shared/contex/context.service';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

type PrismaError = Prisma.PrismaClientKnownRequestError;

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly adapterHost: HttpAdapterHost,
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
      code: error.code,
      meta: error.meta,
      path: req.url,
      method: req.method,
      context: 'PrismaError',
    });

    // Map Prisma error codes to HTTP status and error codes
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
