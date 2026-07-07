export class GlobalApiLock {
  private static lockedUntil: number = 0;
  private static consecutiveFailures: number = 0;
  private static readonly FAILURE_THRESHOLD = 15;
  private static readonly LOCK_DURATION_MS = 60000;

  static recordFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      console.error(`[GLOBAL API LOCK] Threshold exceeded (${this.FAILURE_THRESHOLD}). Locking all AI traffic for ${this.LOCK_DURATION_MS}ms.`);
      this.lockedUntil = Date.now() + this.LOCK_DURATION_MS;
      this.consecutiveFailures = 0;
    }
  }

  static recordSuccess() {
    this.consecutiveFailures = 0;
  }

  static isLocked(): boolean {
    if (Date.now() < this.lockedUntil) {
      return true;
    }
    return false;
  }

  static getRemainingLockTime(): number {
    const remaining = this.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}
