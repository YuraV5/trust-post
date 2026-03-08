import { AppError } from './basic-app-error';
import { AppErrorCode } from './error-codes';

export class AppNotFoundException extends AppError {
  constructor(message = 'Not Found') {
    super(AppErrorCode.NOT_FOUND, 404, message);
  }
}

export class AppValidationException extends AppError {
  constructor(message = 'Validation failed', details?: string[]) {
    super(AppErrorCode.VALIDATION, 400, message, details);
  }
}

export class AppUnauthorizedException extends AppError {
  constructor(message = 'Unauthorized access') {
    super(AppErrorCode.UNAUTHORIZED, 401, message);
  }
}

export class AppForbiddenException extends AppError {
  constructor(message = 'Forbidden access') {
    super(AppErrorCode.FORBIDDEN, 403, message);
  }
}

export class AppInternalServerException extends AppError {
  constructor(message = 'An internal server error occurred', details?: string[]) {
    super(AppErrorCode.INTERNAL, 500, message, details);
  }
}

export class AppConflictException extends AppError {
  constructor(message = 'Conflict occurred') {
    super(AppErrorCode.CONFLICT, 409, message);
  }
}

export class AppBadRequestException extends AppError {
  constructor(message = 'Bad Request') {
    super(AppErrorCode.BAD_REQUEST, 400, message);
  }
}

export class AppConfigException extends AppError {
  constructor(message = 'Configuration error') {
    super(AppErrorCode.CONFIG_ERROR, 500, message);
  }
}
