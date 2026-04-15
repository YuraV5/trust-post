import { ApiProperty } from '@nestjs/swagger';
import { AppErrorCode } from '../../../../shared/errors/error-codes';

export class UnauthorizedErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 401, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: AppErrorCode.UNAUTHORIZED,
  })
  error: string;

  @ApiProperty({ example: 'Unauthorized. Invalid credentials.', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'unauthorized error details or empty field', description: 'Error details', required: false })
  details?: unknown;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
