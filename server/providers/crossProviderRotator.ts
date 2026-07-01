import { HealthMonitor } from './healthMonitor';
import { CerebrasRotator } from './cerebrasRotator';
import { GoogleGenAI } from '@google/genai';

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
    const isGoogle = this.globalProviderToggle === 0;
    
    // Toggle for next request regardless of success/failure
    this.globalProviderToggle = (this.globalProviderToggle + 1) % 2;

    if (isGoogle) {
       try {
         return await this.executeGoogle(contents, config);
       } catch (err: any) {
         console.warn("Google provider failed in CrossProviderRotator, switching to Cerebras...", err);
         return await CerebrasRotator.execute(contents, config);
       }
    } else {
       try {
         return await CerebrasRotator.execute(contents, config);
       } catch (err: any) {
         console.warn("Cerebras provider failed in CrossProviderRotator, switching to Google...", err);
         return await this.executeGoogle(contents, config);
       }
    }
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
