import { ExceptionFilter, Catch, ArgumentsHost, Inject, HttpServer } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { Context } from '../../../shared/contex/context.service';

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
