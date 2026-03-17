import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, finalize, tap } from 'rxjs';
import { Context } from '../../../shared/contex/context.service';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { Response, Request } from 'express';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';

@Injectable()
export class HttpContextInterceptor implements NestInterceptor {
  constructor(@Inject(APP_LOGGER) private readonly logger: IAppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    const ctx = Context.get();
    if (ctx) {
      const route = req.route as { path?: string } | undefined;
      const routePath = route?.path;
      const requestUser = req as Request & { user?: { userId?: string } };
      ctx.method = req.method;
      ctx.path = routePath ?? req.url;
      ctx.userId = requestUser.user?.userId;
    }

    let hasError = false;

    return next.handle().pipe(
      tap({
        error: () => {
          hasError = true;
        },
      }),
      finalize(() => {
        const ctx = Context.get();
        const duration = Date.now() - start;

        if (ctx) {
          ctx.status = res.statusCode;
          ctx.duration = duration;
        }

        // Exception filters log final mapped status codes and payload details.
        // Logging error here can capture stale status (often 200) before filters run.
        if (hasError) return;

        this.logger.info('HTTP request completed', {
          method: req.method,
          path: req.originalUrl ?? req.url,
          statusCode: res.statusCode,
          duration,
        });
      }),
    );
  }
}
