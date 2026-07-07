const fs = require('fs');
let content = fs.readFileSync('server/providers/crossProviderRotator.ts', 'utf-8');

const executeStreamMethod = `  static async *executeStream(contents: any, config: ExecuteConfig = {}): AsyncGenerator<string, void, unknown> {
    if (GlobalApiLock.isLocked()) {
      throw { status: 503, errorCode: 'SERVER_LOCKED', message: \`Server locked for \${GlobalApiLock.getRemainingLockTime()}ms\`, retryAfter: GlobalApiLock.getRemainingLockTime() };
    }

    const isGoogle = this.globalProviderToggle === 0;
    this.globalProviderToggle = (this.globalProviderToggle + 1) % 2;

    let firstProvider = isGoogle ? 'google' : 'cerebras';
    let secondProvider = isGoogle ? 'cerebras' : 'google';

    const tryProviderStream = async function*(providerName: string, that: any): AsyncGenerator<string, void, unknown> {
        if (!CircuitBreaker.check(providerName)) {
           throw { status: 503, errorCode: 'CIRCUIT_OPEN', message: \`Circuit breaker open for \${providerName}\`, retryAfter: CircuitBreaker.getRetryAfter(providerName) };
        }
        // Cannot use RetryManager easily with streams since streams might fail halfway.
        // We will just let the stream implementation handle it or fail.
        try {
            if (providerName === 'google') {
                yield* await that.executeGoogleStream(contents, config);
            } else {
                yield* await CerebrasRotator.executeStream(contents, config);
            }
            CircuitBreaker.recordSuccess(providerName);
        } catch (e) {
            CircuitBreaker.recordFailure(providerName);
            throw e;
        }
    };

    try {
       yield* await tryProviderStream(firstProvider, this);
       GlobalApiLock.recordSuccess();
    } catch (err: any) {
       console.warn(\`\${firstProvider} provider failed in stream, switching to \${secondProvider}...\`, err.message || err);
       try {
           yield* await tryProviderStream(secondProvider, this);
           GlobalApiLock.recordSuccess();
       } catch (err2: any) {
           GlobalApiLock.recordFailure();
           throw err2;
       }
    }
  }`;

content = content.replace(/static async \*executeStream\(contents: any, config: ExecuteConfig = \{\}\): AsyncGenerator<string, void, unknown> \{[\s\S]*?private static async \*executeGoogleStream/m, executeStreamMethod + "\n  private static async *executeGoogleStream");

fs.writeFileSync('server/providers/crossProviderRotator.ts', content);
console.log("Updated executeStream in CrossProviderRotator");
