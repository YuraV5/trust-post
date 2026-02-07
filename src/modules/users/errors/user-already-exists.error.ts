import { AppError } from '../../../shared/errors/basic-app-error';
import { ErrorCode } from '../../../shared/errors/error-codes';

export class UserAlreadyExistsError extends AppError {
  constructor(field: string = 'email') {
    super(ErrorCode.CONFLICT, 409, `User with this ${field} already exists`);
  }
}
