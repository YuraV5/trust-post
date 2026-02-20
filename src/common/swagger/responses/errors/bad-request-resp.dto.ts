import { ApiProperty } from '@nestjs/swagger';
import { AppErrorCode } from '../../../../shared/errors/error-codes';

export class BadRequestErrorResponse {
  @ApiProperty({ example: 'rid', description: 'Request ID' })
  requestId: string;

  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: AppErrorCode.BAD_REQUEST,
  })
  error: string;

  @ApiProperty({ example: 'Bad request.', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'bad request details or empty field', description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ example: '2026-01-30T12:00:00.000Z', description: 'Timestamp of the error' })
  timestamp: string;
}
