import { UnifiedError, RequestContext } from './types';

export class UnifiedErrorHandler {
  static normalizeError(err: any, context: RequestContext): UnifiedError {
    const status = err.status || err.statusCode || 500;
    
    // Determine retryability based on user rules:
    // Retry only: 429, 500, 502, 503, 504, Timeout and Network errors.
    // Never retry: 400, 401, 403, 404, 409, 422.
    const retryableStatuses = [429, 500, 502, 503, 504];
    const nonRetryableStatuses = [400, 401, 403, 404, 409, 422];
    
    let retryable = false;
    
    const errMessage = (err.message || err.toString()).toLowerCase();
    const isTimeout = errMessage.includes('timeout') || errMessage.includes('fetch') || err.name === 'AbortError' || err.code === 'ECONNRESET';

    if (isTimeout) {
      retryable = true;
    } else if (retryableStatuses.includes(status)) {
      retryable = true;
    } else if (nonRetryableStatuses.includes(status)) {
      retryable = false;
    } else {
      retryable = status >= 500;
    }

    const unifiedErr: UnifiedError = {
      provider: context.provider,
      endpoint: context.endpoint,
      status: status,
      errorCode: err.code || 'UNKNOWN_ERROR',
      retryable: retryable,
      userMessage: this.getUserMessage(status, isTimeout),
      developerMessage: err.message || err.toString(),
      timestamp: new Date().toISOString(),
      requestId: context.requestId
    };

    return unifiedErr;
  }

  private static getUserMessage(status: number, isTimeout: boolean): string {
    if (isTimeout) return "Lỗi kết nối hoặc hệ thống phản hồi quá lâu.";
    if (status === 429) return "Hệ thống đang quá tải, vui lòng thử lại sau.";
    if (status >= 500) return "Lỗi máy chủ AI, vui lòng thử lại sau.";
    if (status === 401 || status === 403) return "Lỗi xác thực khóa API.";
    return "Đã xảy ra lỗi không xác định.";
  }

  static logError(err: UnifiedError, rawErrorBody?: string) {
    console.error(JSON.stringify({
      logType: 'AI_RESILIENCE_ERROR',
      timestamp: err.timestamp,
      requestId: err.requestId,
      endpoint: err.endpoint,
      provider: err.provider,
      status: err.status,
      errorCode: err.errorCode,
      errorBody: rawErrorBody || err.developerMessage,
      retryable: err.retryable
    }));
  }
}
