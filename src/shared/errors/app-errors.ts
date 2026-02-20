import { AppError } from './basic-app-error';
import { AppErrorCode } from './error-codes';

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(AppErrorCode.NOT_FOUND, 404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: string[]) {
    super(AppErrorCode.VALIDATION, 400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(AppErrorCode.UNAUTHORIZED, 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(AppErrorCode.FORBIDDEN, 403, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An internal server error occurred', details?: string[]) {
    super(AppErrorCode.INTERNAL, 500, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict occurred') {
    super(AppErrorCode.CONFLICT, 409, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(AppErrorCode.BAD_REQUEST, 400, message);
  }
}
