import { UnifiedErrorHandler } from './unifiedErrorHandler';
import { CircuitBreaker } from './circuitBreaker';
import { GlobalApiLock } from './globalApiLock';
import { RequestContext } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RetryManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;

  static async executeWithResilience<T>(
    provider: string,
    endpoint: string,
    action: (attempt: number) => Promise<T>
  ): Promise<T> {
    const context: RequestContext = {
      requestId: uuidv4(),
      provider,
      endpoint,
      retries: 0,
      startTime: Date.now()
    };

    let attempt = 0;
    while (true) {
      if (GlobalApiLock.isLocked()) {
        const remaining = GlobalApiLock.getRemainingLockTime();
        throw { status: 503, errorCode: 'SERVER_LOCKED', message: `Server locked for ${remaining}ms`, retryAfter: remaining };
      }

      if (!CircuitBreaker.check(provider)) {
        const remaining = CircuitBreaker.getRetryAfter(provider);
        throw { status: 503, errorCode: 'CIRCUIT_OPEN', message: `Circuit breaker open for ${provider}`, retryAfter: remaining };
      }

      try {
        const startTime = Date.now();
        const result = await action(attempt);
        const latency = Date.now() - startTime;
        
        CircuitBreaker.recordSuccess(provider);
        GlobalApiLock.recordSuccess();

        // Structured success logging
        console.log(JSON.stringify({
          logType: 'AI_RESILIENCE_SUCCESS',
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
          endpoint: context.endpoint,
          provider: provider,
          latency: latency,
          attempt: attempt + 1
        }));

        return result;
      } catch (err: any) {
        CircuitBreaker.recordFailure(provider);
        GlobalApiLock.recordFailure();

        const unifiedErr = UnifiedErrorHandler.normalizeError(err, context);
        UnifiedErrorHandler.logError(unifiedErr, err.message);

        if (!unifiedErr.retryable || attempt >= this.MAX_RETRIES) {
          throw unifiedErr;
        }

        attempt++;
        const delay = (this.BASE_DELAY_MS * Math.pow(2, attempt)) + (Math.random() * 500);
        console.warn(`[RETRY MANAGER] ${provider} failed. Retrying ${attempt}/${this.MAX_RETRIES} in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}
