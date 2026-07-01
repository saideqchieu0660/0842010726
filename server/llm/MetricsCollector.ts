export class MetricsCollector {
  private static metrics = {
    totalRequests: 0,
    genuineResponses: 0,
    unnecessaryRefusals: 0,
    policyRefusals: 0,
    networkFailures: 0,
    successfulRetries: 0,
    totalLatencyMs: 0,
    totalTokens: 0
  };

  static recordRequest(latencyMs: number, classification: string, tokensEstimate: number) {
    this.metrics.totalRequests++;
    this.metrics.totalLatencyMs += latencyMs;
    this.metrics.totalTokens += tokensEstimate;

    switch (classification) {
      case "GENUINE":
        this.metrics.genuineResponses++;
        break;
      case "UNNECESSARY_REFUSAL":
        this.metrics.unnecessaryRefusals++;
        break;
      case "POLICY_REFUSAL":
        this.metrics.policyRefusals++;
        break;
      case "NETWORK_FAILURE":
        this.metrics.networkFailures++;
        break;
    }
  }

  static recordSuccessfulRetry() {
    this.metrics.successfulRetries++;
  }

  static getStats() {
    const avgLatency = this.metrics.totalRequests > 0 
      ? this.metrics.totalLatencyMs / this.metrics.totalRequests 
      : 0;
      
    const falseRefusalRate = this.metrics.totalRequests > 0 
      ? (this.metrics.unnecessaryRefusals / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      avgLatencyMs: Math.round(avgLatency),
      falseRefusalRatePct: falseRefusalRate.toFixed(2)
    };
  }
}
