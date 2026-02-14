import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../shared/errors/basic-app-error';
import { ErrorCode } from '../../../shared/errors/error-codes';

export class EmailServiceUnavailableError extends AppError {
  constructor(message = 'Email service is temporarily unavailable. Please try again later.', details?: string[]) {
    super(ErrorCode.EMAIL_SERVICE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE, message, details);
  }
}

export class EmailSendFailedError extends AppError {
  constructor(message = 'Failed to send email. Please try again later.', details?: string[]) {
    super(ErrorCode.EMAIL_SEND_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, message, details);
  }
}

export class EmailTimeoutError extends AppError {
  constructor(message = 'Email service request timeout. Please try again later.', details?: string[]) {
    super(ErrorCode.EMAIL_TIMEOUT, HttpStatus.REQUEST_TIMEOUT, message, details);
  }
}

export class InvalidEmailConfigError extends AppError {
  constructor(message = 'Email service configuration error.', details?: string[]) {
    super(ErrorCode.INVALID_EMAIL_CONFIG, HttpStatus.INTERNAL_SERVER_ERROR, message, details);
  }
}

export class VerificationEmailFailedError extends AppError {
  constructor(message = 'Failed to send verification email. Please try again later.', details?: string[]) {
    super(ErrorCode.VERIFICATION_EMAIL_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, message, details);
  }
}

export class ResetPasswordEmailFailedError extends AppError {
  constructor(message = 'Failed to send password reset email. Please try again later.', details?: string[]) {
    super(ErrorCode.RESET_PASSWORD_EMAIL_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, message, details);
  }
}
