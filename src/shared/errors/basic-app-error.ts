import { HttpException } from '@nestjs/common';
import { AppErrorCode } from './error-codes';

export class AppError extends HttpException {
  constructor(
    public readonly code: AppErrorCode,
    status: number,
    message: string,
    public readonly details?: string[],
  ) {
    super(message, status);
  }
}
