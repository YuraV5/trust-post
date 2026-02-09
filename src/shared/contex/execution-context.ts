export interface ExecutionContext {
  requestId: string;
  ip: string;
  userAgent: string;
  deviceName: string;

  // HTTP
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
}
