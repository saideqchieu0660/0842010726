import { CerebrasRotator } from './cerebrasRotator';
import { CrossProviderRotator } from './crossProviderRotator';
import { HealthMonitor } from './healthMonitor';

export class ProviderManager {
  static async executeCerebrasOnly(contents: any, config: any = {}): Promise<string> {
    return await CerebrasRotator.execute(contents, config);
  }

  static async executeCrossProvider(contents: any, config: any = {}): Promise<string> {
    return await CrossProviderRotator.execute(contents, config);
  }

  // Auto-recovery heartbeat
  static startHeartbeat() {
    setInterval(() => {
       HealthMonitor.autoRecover();
    }, 15000); // Check every 15s
  }

  // Dashboard API hooks
  static getDashboardState() {
    return {
      googleKeyStates: HealthMonitor.getStates('google'),
      cerebrasKeyStates: HealthMonitor.getStates('cerebras'),
      openRouterKeyStates: HealthMonitor.getStates('openrouter'),
      googleLogs: HealthMonitor.googleLogs,
      cerebrasLogs: HealthMonitor.cerebrasLogs,
      openRouterLogs: HealthMonitor.openRouterLogs
    };
  }
}

ProviderManager.startHeartbeat();
