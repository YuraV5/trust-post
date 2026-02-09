import { AppError } from './basic-app-error';
import { ErrorCode } from './error-codes';

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(ErrorCode.NOT_FOUND, 404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: string[]) {
    super(ErrorCode.VALIDATION, 400, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(ErrorCode.UNAUTHORIZED, 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(ErrorCode.FORBIDDEN, 403, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An internal server error occurred', details?: string[]) {
    super(ErrorCode.INTERNAL, 500, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict occurred') {
    super(ErrorCode.CONFLICT, 409, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(ErrorCode.BAD_REQUEST, 400, message);
  }
}
