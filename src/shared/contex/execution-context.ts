export interface ExecutionContext {
  requestId: string;
  ip: string;
  userAgent: string;
  userId?: string;

  // HTTP
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
}
