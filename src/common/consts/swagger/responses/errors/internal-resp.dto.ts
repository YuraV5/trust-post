import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../../../../libs/errors/error-codes';

export class InternalErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 500, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: ErrorCode.INTERNAL,
  })
  error: string;

  @ApiProperty({ example: 'Internal server error.', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'internal error details or empty field', description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
