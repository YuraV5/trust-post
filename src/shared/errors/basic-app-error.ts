import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message, status);
  }
}
