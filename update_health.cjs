const fs = require('fs');

let content = fs.readFileSync('server/providers/healthMonitor.ts', 'utf-8');

const additionalMetrics = `
  static providerMetrics: Record<string, { totalRequests: number; successes: number; failures: number; timeouts: number; totalLatency: number }> = {
     google: { totalRequests: 0, successes: 0, failures: 0, timeouts: 0, totalLatency: 0 },
     cerebras: { totalRequests: 0, successes: 0, failures: 0, timeouts: 0, totalLatency: 0 },
     openrouter: { totalRequests: 0, successes: 0, failures: 0, timeouts: 0, totalLatency: 0 }
  };

  static recordProviderLatency(provider: string, latency: number) {
      if (this.providerMetrics[provider]) {
          this.providerMetrics[provider].totalRequests++;
          this.providerMetrics[provider].totalLatency += latency;
      }
  }

  static getProviderStats(provider: string) {
      const stats = this.providerMetrics[provider] || { totalRequests: 0, successes: 0, failures: 0, timeouts: 0, totalLatency: 0 };
      const total = stats.totalRequests || 1;
      return {
          successRate: (stats.successes / total) * 100,
          failureRate: (stats.failures / total) * 100,
          timeoutRate: (stats.timeouts / total) * 100,
          averageLatency: stats.totalLatency / total
      };
  }
`;

content = content.replace(/static openRouterLogs: RotationLog\[\] = \[\];/, "static openRouterLogs: RotationLog[] = [];\n" + additionalMetrics);

const newCreateInitialState = `  private static createInitialState(key: string, index: number): KeyState {
    return {
      index,
      key,
      maskedKey: key.startsWith("gsk_") || key.startsWith("csk_") ? \`\${key.substring(0, 11)}...\${key.slice(-4)}\` : \`***\${key.slice(-4)}\`,
      status: "active",
      errorCount: 0,
      usageCount: 0,
      lastUsed: null,
      throttleUntil: 0,
      unlockTime: 0,
      healthScore: 100,
      lastSuccess: null,
      lastFailure: null
    };
  }`;

content = content.replace(/private static createInitialState[\s\S]*?\}/, newCreateInitialState);

const newReportUsage = `  static reportUsage(provider: 'google' | 'cerebras' | 'openrouter', index: number, latencyMs?: number) {
    if (latencyMs) this.recordProviderLatency(provider, latencyMs);
    this.providerMetrics[provider].successes++;

    const states = this.getStates(provider);
    const state = states.find(s => s.index === index);
    if (state) {
      state.usageCount++;
      state.lastUsed = new Date();
      state.lastSuccess = new Date();
      state.healthScore = Math.min(100, state.healthScore + 5);
      
      if (this.firestoreSyncCallback) {
        let offset = 0;
        if (provider === 'cerebras') offset = 200;
        if (provider === 'openrouter') offset = 100;
        this.firestoreSyncCallback(state.index + offset, 'usage');
      }
    }
  }`;

content = content.replace(/static reportUsage[\s\S]*?\}\n  \}/, newReportUsage);

const newReportError = `  static reportError(provider: 'google' | 'cerebras' | 'openrouter', index: number, is429: boolean, isFatal: boolean, errorMsg: string, isTimeout?: boolean) {
    this.providerMetrics[provider].failures++;
    if (isTimeout) this.providerMetrics[provider].timeouts++;

    const states = this.getStates(provider);
    const state = states.find(s => s.index === index);
    if (state) {
      state.errorCount++;
      state.lastUsed = new Date();
      state.lastFailure = new Date();
      state.healthScore = Math.max(0, state.healthScore - (isFatal ? 100 : is429 ? 10 : 20));
      
      if (isFatal || state.healthScore <= 0) {
        state.status = "HARD_LOCKED";
        state.is_banned = true;
      } else if (is429) {
        if (provider === 'cerebras') {
          state.status = "ISOLATED";
          state.unlockTime = Date.now() + 60000;
        } else {
          state.status = "rate_limited";
        }
      } else {
        state.status = "failed";
      }
      this.addLog(provider, {
        id: \`log-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
        timestamp: new Date().toISOString(),
        toKeyIndex: index,
        reason: errorMsg.substring(0, 100)
      });
      if (this.firestoreSyncCallback) {
        let offset = 0;
        if (provider === 'cerebras') offset = 200;
        if (provider === 'openrouter') offset = 100;
        this.firestoreSyncCallback(state.index + offset, 'error');
      }
    }
  }`;

content = content.replace(/static reportError[\s\S]*?\}\n  \}/, newReportError);


fs.writeFileSync('server/providers/healthMonitor.ts', content);
console.log("Updated HealthMonitor");
