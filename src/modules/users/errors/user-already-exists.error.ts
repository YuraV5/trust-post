import { AppError } from '../../../shared/errors/basic-app-error';
import { AppErrorCode } from '../../../shared/errors/error-codes';

export class UserAlreadyExistsError extends AppError {
  constructor(field: string = 'email') {
    super(AppErrorCode.CONFLICT, 409, `User with this ${field} already exists`);
  }
}
