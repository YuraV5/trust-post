import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Context } from '../../../shared/contex/context.service';
import { AppError } from '../../../shared/errors/basic-app-error';
import { ErrorCode } from '../../../shared/errors/error-codes';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const requestId = Context.get()?.requestId || 'no-rid';

    let status = exception.getStatus();
    let code = ErrorCode.INTERNAL;
    let message = exception.message;
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof BadRequestException) {
      code = ErrorCode.VALIDATION;
      const r = exception.getResponse() as { message?: string | string[] };

      if (Array.isArray(r.message)) {
        message = 'Validation failed';
        details = r.message;
      } else {
        message = r.message ?? 'Validation failed';
      }
    } else if (exception instanceof NotFoundException) {
      status = 404;
      code = ErrorCode.NOT_FOUND;
      message = 'Resource not found';
    }

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
