import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
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
      ctx.method = req.method;
      ctx.path = routePath ?? req.url;
    }

    return next.handle().pipe(
      tap(() => {
        const ctx = Context.get();
        if (ctx) {
          ctx.status = res.statusCode;
          ctx.duration = Date.now() - start;
        }

        this.logger.info('HTTP request completed');
      }),
    );
  }
}
