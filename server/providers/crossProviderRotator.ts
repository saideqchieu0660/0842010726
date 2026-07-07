import { HealthMonitor } from './healthMonitor';
import { CerebrasRotator } from './cerebrasRotator';
import { GoogleGenAI } from '@google/genai';
import { GlobalApiLock } from './resilience/globalApiLock';
import { CircuitBreaker } from './resilience/circuitBreaker';
import { RetryManager } from './resilience/retryManager';


interface ExecuteConfig {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  maxOutputTokens?: number;
}

export class CrossProviderRotator {
  private static globalProviderToggle = 0; // 0 = Google, 1 = Cerebras
  private static googleKeyIndex = 0;
  
    static async execute(contents: any, config: ExecuteConfig = {}): Promise<string> {
    if (GlobalApiLock.isLocked()) {
      throw { status: 503, errorCode: 'SERVER_LOCKED', message: `Server locked for ${GlobalApiLock.getRemainingLockTime()}ms`, retryAfter: GlobalApiLock.getRemainingLockTime() };
    }

    const isGoogle = this.globalProviderToggle === 0;
    this.globalProviderToggle = (this.globalProviderToggle + 1) % 2;
    
    let firstProvider = isGoogle ? 'google' : 'cerebras';
    let secondProvider = isGoogle ? 'cerebras' : 'google';

    const tryProvider = async (providerName: string) => {
        if (!CircuitBreaker.check(providerName)) {
           throw { status: 503, errorCode: 'CIRCUIT_OPEN', message: `Circuit breaker open for ${providerName}`, retryAfter: CircuitBreaker.getRetryAfter(providerName) };
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
       console.warn(`${firstProvider} provider failed in CrossProviderRotator, switching to ${secondProvider}...`, err.message || err);
       try {
           const res = await tryProvider(secondProvider);
           GlobalApiLock.recordSuccess();
           return res;
       } catch (err2: any) {
           GlobalApiLock.recordFailure();
           throw err2;
       }
    }
  }
    static async *executeStream(contents: any, config: ExecuteConfig = {}): AsyncGenerator<string, void, unknown> {
    if (GlobalApiLock.isLocked()) {
      throw { status: 503, errorCode: 'SERVER_LOCKED', message: `Server locked for ${GlobalApiLock.getRemainingLockTime()}ms`, retryAfter: GlobalApiLock.getRemainingLockTime() };
    }

    const isGoogle = this.globalProviderToggle === 0;
    this.globalProviderToggle = (this.globalProviderToggle + 1) % 2;

    let firstProvider = isGoogle ? 'google' : 'cerebras';
    let secondProvider = isGoogle ? 'cerebras' : 'google';

    const tryProviderStream = async function*(providerName: string, that: any): AsyncGenerator<string, void, unknown> {
        if (!CircuitBreaker.check(providerName)) {
           throw { status: 503, errorCode: 'CIRCUIT_OPEN', message: `Circuit breaker open for ${providerName}`, retryAfter: CircuitBreaker.getRetryAfter(providerName) };
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
       console.warn(`${firstProvider} provider failed in stream, switching to ${secondProvider}...`, err.message || err);
       try {
           yield* await tryProviderStream(secondProvider, this);
           GlobalApiLock.recordSuccess();
       } catch (err2: any) {
           GlobalApiLock.recordFailure();
           throw err2;
       }
    }
  }
  
  static async executePersonal(contents: any, key: string, provider: 'google' | 'cerebras', config: ExecuteConfig = {}): Promise<string> {
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        const res = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: contents,
           config: config
        });
        return res.text || "";
    } else {
        const fetch = require('node-fetch');
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: typeof contents === 'string' ? [{role: 'user', content: contents}] : contents,
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxOutputTokens
            })
        });
        if (!res.ok) throw new Error(`Cerebras Personal API Error: ${res.statusText}`);
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
    }
  }

  static async *executePersonalStream(contents: any, key: string, provider: 'google' | 'cerebras', config: ExecuteConfig = {}): AsyncGenerator<string, void, unknown> {
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        const res = await ai.models.generateContentStream({
           model: "gemini-2.5-flash",
           contents: contents,
           config: config
        });
        for await (const chunk of res) {
            if (chunk.text) yield chunk.text;
        }
    } else {
        const fetch = require('node-fetch');
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: typeof contents === 'string' ? [{role: 'user', content: contents}] : contents,
                temperature: config.temperature ?? 0.7,
                stream: true,
                max_tokens: config.maxOutputTokens
            })
        });
        if (!res.ok) throw new Error(`Cerebras Personal API Error: ${res.statusText}`);
        if (!res.body) throw new Error('No response body');
        for await (const chunk of res.body) {
            const str = chunk.toString();
            const lines = str.split('\n').filter(l => l.startsWith('data: '));
            for (const line of lines) {
                if (line === 'data: [DONE]') return;
                try {
                    const data = JSON.parse(line.substring(6));
                    const text = data.choices?.[0]?.delta?.content;
                    if (text) yield text;
                } catch (e) {}
            }
        }
    }
  }

  private static async *executeGoogleStream(contents: any, config: ExecuteConfig = {}): AsyncGenerator<string, void, unknown> {
    const states = HealthMonitor.getStates('google');
    if (states.length === 0) throw new Error("No Google keys available.");
    const maxAttempts = states.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const state = states[this.googleKeyIndex];
      this.googleKeyIndex = (this.googleKeyIndex + 1) % states.length;
      attempts++;

      if (state.status === "HARD_LOCKED" || state.is_banned) continue;

      let startedYielding = false;
      try {
        const ai = new GoogleGenAI({ apiKey: state.key });
        const res = await ai.models.generateContentStream({
           model: "gemini-2.5-flash",
           contents: contents,
           config: config
        });
        
        let hasYielded = false;
        for await (const chunk of res) {
           hasYielded = true;
           if (!startedYielding) {
               HealthMonitor.reportUsage('google', state.index);
               startedYielding = true;
           }
           if (chunk.text) {
               yield chunk.text;
           }
        }
        
        return;
      } catch (err: any) {
        if (startedYielding) {
           throw err; // if it failed mid-stream, don't try another key and corrupt output
        }
        const is429 = err.status === 429 || err.message?.includes("429") || err.message?.includes("quota");
        const isFatal = err.status === 401 || err.status === 403 || err.message?.includes("API_KEY_INVALID");
        HealthMonitor.reportError('google', state.index, is429, isFatal, err.message || err.toString());
      }
    }
    
    throw new Error("All Google keys exhausted or locked.");
  }

  private static async executeGoogle(contents: any, config: ExecuteConfig = {}): Promise<string> {
    const states = HealthMonitor.getStates('google');
    if (states.length === 0) throw new Error("No Google keys available.");

    const maxAttempts = states.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const state = states[this.googleKeyIndex];
      this.googleKeyIndex = (this.googleKeyIndex + 1) % states.length;
      attempts++;

      if (state.status === "HARD_LOCKED" || state.is_banned) continue;

      try {
        const ai = new GoogleGenAI({ apiKey: state.key });
        const res = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: contents,
           config: config
        });
        
        const responseText = res.text || "";
        if (responseText) {
           HealthMonitor.reportUsage('google', state.index);
           return responseText;
        }
      } catch (err: any) {
        const is429 = err.status === 429 || err.message?.includes("429") || err.message?.includes("quota");
        const isFatal = err.status === 401 || err.status === 403 || err.message?.includes("API_KEY_INVALID");
        HealthMonitor.reportError('google', state.index, is429, isFatal, err.message || err.toString());
      }
    }
    
    throw new Error("All Google keys exhausted or locked.");
  }
}
