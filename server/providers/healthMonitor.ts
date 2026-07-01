import { KeyState, RotationLog, ProviderRegistry } from './providerRegistry';

// We manage the state here
export class HealthMonitor {
  static googleKeyStates: KeyState[] = [];
  static cerebrasKeyStates: KeyState[] = [];
  static openRouterKeyStates: KeyState[] = [];
  
  static googleLogs: RotationLog[] = [];
  static cerebrasLogs: RotationLog[] = [];
  static openRouterLogs: RotationLog[] = [];

  // Callback to update firestore (will be injected from server.ts)
  static firestoreSyncCallback: ((index: number, metric: "usage" | "error") => void) | null = null;
  static firestoreLogCallback: ((log: any, collection: string, docId: string) => void) | null = null;

  static initialize() {
    this.googleKeyStates = ProviderRegistry.getKeys('google').map((key, i) => this.createInitialState(key, i + 1));
    this.cerebrasKeyStates = ProviderRegistry.getKeys('cerebras').map((key, i) => this.createInitialState(key, i + 1));
    this.openRouterKeyStates = ProviderRegistry.getKeys('openrouter').map((key, i) => this.createInitialState(key, i + 1));
  }

  private static createInitialState(key: string, index: number): KeyState {
    return {
      index,
      key,
      maskedKey: key.startsWith("gsk_") || key.startsWith("csk_") ? `${key.substring(0, 11)}...${key.slice(-4)}` : `***${key.slice(-4)}`,
      status: "active",
      errorCount: 0,
      usageCount: 0,
      lastUsed: null,
      throttleUntil: 0,
      unlockTime: 0
    };
  }

  static getStates(provider: 'google' | 'cerebras' | 'openrouter') {
    switch (provider) {
      case 'google': return this.googleKeyStates;
      case 'cerebras': return this.cerebrasKeyStates;
      case 'openrouter': return this.openRouterKeyStates;
    }
  }

  static reportUsage(provider: 'google' | 'cerebras' | 'openrouter', index: number) {
    const states = this.getStates(provider);
    const state = states.find(s => s.index === index);
    if (state) {
      state.usageCount++;
      state.lastUsed = new Date();
      if (this.firestoreSyncCallback) {
        let offset = 0;
        if (provider === 'cerebras') offset = 200;
        if (provider === 'openrouter') offset = 100;
        this.firestoreSyncCallback(state.index + offset, 'usage');
      }
    }
  }

  static reportError(provider: 'google' | 'cerebras' | 'openrouter', index: number, is429: boolean, isFatal: boolean, errorMsg: string) {
    const states = this.getStates(provider);
    const state = states.find(s => s.index === index);
    if (state) {
      state.errorCount++;
      state.lastUsed = new Date();
      
      if (isFatal) {
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
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
  }

  static addLog(provider: 'google' | 'cerebras' | 'openrouter', log: RotationLog) {
    const logs = provider === 'google' ? this.googleLogs : provider === 'cerebras' ? this.cerebrasLogs : this.openRouterLogs;
    logs.unshift(log);
    if (logs.length > 20) logs.pop();

    if (this.firestoreLogCallback) {
       const collection = provider === 'google' ? 'gemini_rotation_logs' : provider === 'cerebras' ? 'groq_rotation_logs' : 'openrouter_rotation_logs';
       this.firestoreLogCallback(log, collection, log.id);
    }
  }

  static autoRecover() {
    const now = Date.now();
    ['google', 'cerebras', 'openrouter'].forEach(p => {
       const states = this.getStates(p as any);
       states.forEach(s => {
          if (s.status === "HARD_LOCKED" || s.is_banned) return;

          if (s.status === "ISOLATED") {
            const unlock = s.unlockTime || 0;
            if (now >= unlock) {
              s.status = "active";
              s.unlockTime = 0;
              this.addLog(p as any, {
                id: `log-${now}-${Math.random().toString(36).substr(2,5)}`,
                timestamp: new Date().toISOString(),
                toKeyIndex: s.index,
                reason: `${p} Key auto-recovered from ISOLATED cooldown`
              });
            }
          } else if ((s.status === "rate_limited" || s.status === "failed") && s.lastUsed) {
            const cooldown = p === 'google' ? 60000 : p === 'cerebras' ? 60000 : 120000;
            if (now - s.lastUsed.getTime() > cooldown) {
              const old = s.status;
              s.status = "active";
              this.addLog(p as any, {
                id: `log-${now}-${Math.random().toString(36).substr(2,5)}`,
                timestamp: new Date().toISOString(),
                toKeyIndex: s.index,
                reason: `${p} Key auto-recovered from ${old} cooldown`
              });
            }
          }
       });
    });
  }
}

HealthMonitor.initialize();
