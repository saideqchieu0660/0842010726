import { CircuitState } from './types';

interface BreakerState {
  state: CircuitState;
  failures: number;
  lockedUntil: number;
}

export class CircuitBreaker {
  private static providers: Record<string, BreakerState> = {};
  private static readonly MAX_FAILURES = 5;
  private static readonly COOLDOWN_MS = 30000;

  private static getState(provider: string): BreakerState {
    if (!this.providers[provider]) {
      this.providers[provider] = { state: 'CLOSED', failures: 0, lockedUntil: 0 };
    }
    return this.providers[provider];
  }

  static check(provider: string): boolean {
    const s = this.getState(provider);
    
    if (s.state === 'OPEN') {
      if (Date.now() >= s.lockedUntil) {
        s.state = 'HALF_OPEN';
        console.warn(`[CIRCUIT BREAKER] ${provider} entered HALF-OPEN state.`);
        return true;
      }
      return false;
    }
    return true;
  }

  static recordSuccess(provider: string) {
    const s = this.getState(provider);
    if (s.state === 'HALF_OPEN' || s.failures > 0) {
      console.log(`[CIRCUIT BREAKER] ${provider} entered CLOSED state (Recovered).`);
    }
    s.failures = 0;
    s.state = 'CLOSED';
  }

  static recordFailure(provider: string) {
    const s = this.getState(provider);
    s.failures++;
    if (s.failures >= this.MAX_FAILURES || s.state === 'HALF_OPEN') {
      s.state = 'OPEN';
      s.lockedUntil = Date.now() + this.COOLDOWN_MS;
      console.error(`[CIRCUIT BREAKER] ${provider} entered OPEN state for ${this.COOLDOWN_MS}ms.`);
    }
  }

  static getRetryAfter(provider: string): number {
    const s = this.getState(provider);
    const rem = s.lockedUntil - Date.now();
    return rem > 0 ? rem : 0;
  }
}
