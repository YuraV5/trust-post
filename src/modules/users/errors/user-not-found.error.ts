import { AppError } from '../../../shared/errors/basic-app-error';
import { ErrorCode } from '../../../shared/errors/error-codes';

export class UserNotFoundError extends AppError {
  constructor(message = 'User not found') {
    super(ErrorCode.NOT_FOUND, 404, message);
  }
}
