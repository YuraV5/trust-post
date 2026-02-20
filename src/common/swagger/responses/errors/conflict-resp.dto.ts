import { ApiProperty } from '@nestjs/swagger';
import { AppErrorCode } from '../../../../shared/errors/error-codes';

export class ConflictErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 409, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: AppErrorCode.CONFLICT,
  })
  error: string;

  @ApiProperty({ example: 'Conflict occurred', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'conflict details or empty field', description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
