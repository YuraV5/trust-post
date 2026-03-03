import { AppError } from '../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../shared/errors/error-codes';

export class AppUserNotFoundException extends AppError {
  constructor(message = 'User not found') {
    super(AppErrorCode.NOT_FOUND, 404, message);
  }
}
