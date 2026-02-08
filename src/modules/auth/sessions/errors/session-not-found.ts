import { AppError } from '../../../../shared/errors/basic-app-error';
import { ErrorCode } from '../../../../shared/errors/error-codes';

export class SessionNotFoundError extends AppError {
  constructor(message = 'Session not found') {
    super(ErrorCode.SESSION_NOT_FOUND, 404, message);
  }
}
