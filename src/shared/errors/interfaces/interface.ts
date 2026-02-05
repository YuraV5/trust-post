export interface ApiErrorResponse {
  requestId: string;
  statusCode: number;
  error: string;
  message: string;
  code: string;
  details?: string[] | string;
  timestamp: string;
}
