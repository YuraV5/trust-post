import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Context } from '../../shared/contex/context.service';

@Injectable()
export class RequestExecutionContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      req.headers['x-request-id']?.toString() ?? uuidv4();

    res.setHeader('x-request-id', requestId);

    Context.run({ requestId }, () => next());
  }
}
