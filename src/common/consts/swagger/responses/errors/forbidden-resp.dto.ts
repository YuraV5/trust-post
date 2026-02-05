import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../../../../libs/errors/error-codes';

export class ForbiddenErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 403, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: ErrorCode.FORBIDDEN,
  })
  error: string;

  @ApiProperty({ example: 'You do not have permission to access this resource.', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'forbidden details or empty field', description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
