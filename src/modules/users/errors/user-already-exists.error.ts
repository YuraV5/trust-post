import { AppError } from '../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../shared/errors/error-codes';

export class AppUserAlreadyExistsException extends AppError {
  constructor() {
    super(AppErrorCode.CONFLICT, 409, `Invalid credentials.`);
  }
}
