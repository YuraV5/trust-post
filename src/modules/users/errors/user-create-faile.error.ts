import { AppError } from '../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../shared/errors/error-codes';

export class UserCreateFailedError extends AppError {
  constructor(message = 'Failed to create user', details?: string[]) {
    super(AppErrorCode.USER_CREATE_FAILED, 500, message, details);
    this.name = 'UserCreateFailedError';
  }
}
