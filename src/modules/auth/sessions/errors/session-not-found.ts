import { AppError } from '../../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../../shared/errors/error-codes';

export class SessionNotFoundError extends AppError {
  constructor(message = 'Session not found') {
    super(AppErrorCode.SESSION_NOT_FOUND, 404, message);
  }
}
