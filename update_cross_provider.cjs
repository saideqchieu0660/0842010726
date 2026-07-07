const fs = require('fs');
let content = fs.readFileSync('server/providers/crossProviderRotator.ts', 'utf-8');

const imports = `import { HealthMonitor } from './healthMonitor';
import { CerebrasRotator } from './cerebrasRotator';
import { GoogleGenAI } from '@google/genai';
import { GlobalApiLock } from './resilience/globalApiLock';
import { CircuitBreaker } from './resilience/circuitBreaker';
import { RetryManager } from './resilience/retryManager';
`;

content = content.replace(/import \{ HealthMonitor \} from '\.\/healthMonitor';\nimport \{ CerebrasRotator \} from '\.\/cerebrasRotator';\nimport \{ GoogleGenAI \} from '@google\/genai';/, imports);

const executeMethod = `  static async execute(contents: any, config: ExecuteConfig = {}): Promise<string> {
    if (GlobalApiLock.isLocked()) {
      throw { status: 503, errorCode: 'SERVER_LOCKED', message: \`Server locked for \${GlobalApiLock.getRemainingLockTime()}ms\`, retryAfter: GlobalApiLock.getRemainingLockTime() };
    }

    const isGoogle = this.globalProviderToggle === 0;
    this.globalProviderToggle = (this.globalProviderToggle + 1) % 2;
    
    let firstProvider = isGoogle ? 'google' : 'cerebras';
    let secondProvider = isGoogle ? 'cerebras' : 'google';

    const tryProvider = async (providerName: string) => {
        if (!CircuitBreaker.check(providerName)) {
           throw { status: 503, errorCode: 'CIRCUIT_OPEN', message: \`Circuit breaker open for \${providerName}\`, retryAfter: CircuitBreaker.getRetryAfter(providerName) };
        }
        return RetryManager.executeWithResilience(providerName, 'generateContent', async (attempt) => {
            if (providerName === 'google') {
                return await this.executeGoogle(contents, config);
            } else {
                return await CerebrasRotator.execute(contents, config);
            }
        });
    };

    try {
       const res = await tryProvider(firstProvider);
       GlobalApiLock.recordSuccess();
       return res;
    } catch (err: any) {
       console.warn(\`\${firstProvider} provider failed in CrossProviderRotator, switching to \${secondProvider}...\`, err.message || err);
       try {
           const res = await tryProvider(secondProvider);
           GlobalApiLock.recordSuccess();
           return res;
       } catch (err2: any) {
           GlobalApiLock.recordFailure();
           throw err2;
       }
    }
  }`;

content = content.replace(/static async execute\(contents: any, config: ExecuteConfig = \{\}\): Promise<string> \{[\s\S]*?static async \*executeStream/m, executeMethod + "\n  static async *executeStream");

fs.writeFileSync('server/providers/crossProviderRotator.ts', content);
console.log("Updated CrossProviderRotator");
