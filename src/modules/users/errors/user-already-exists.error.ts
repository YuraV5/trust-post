import { AppError } from '../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../shared/errors/error-codes';

export class UserAlreadyExistsError extends AppError {
  constructor() {
    super(AppErrorCode.CONFLICT, 409, `User already exists`);
  }
}
