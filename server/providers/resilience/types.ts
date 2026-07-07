export interface UnifiedError {
  provider: string;
  endpoint: string;
  status: number;
  errorCode: string;
  retryable: boolean;
  userMessage: string;
  developerMessage: string;
  timestamp: string;
  requestId: string;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface RequestContext {
  requestId: string;
  provider: string;
  endpoint: string;
  retries: number;
  startTime: number;
}
