import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../../../../shared/errors/error-codes';

export class NotFoundErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: ErrorCode.NOT_FOUND,
  })
  error: string;

  @ApiProperty({ example: 'Not Found', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'not found details or empty field', description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
