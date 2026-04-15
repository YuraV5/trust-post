import { ApiProperty } from '@nestjs/swagger';
import { AppErrorCode } from '../../../../shared/errors/error-codes';

export class ForbiddenErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 403, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: AppErrorCode.FORBIDDEN,
  })
  error: string;

  @ApiProperty({ example: 'You do not have permission to access this resource.', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'forbidden details or empty field', description: 'Error details', required: false })
  details?: unknown;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
