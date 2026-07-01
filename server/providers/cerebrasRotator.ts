import { HealthMonitor } from './healthMonitor';
import { GoogleGenAI } from '@google/genai';

interface ExecuteConfig {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  maxOutputTokens?: number;
}

export class CerebrasRotator {
  private static currentIndex = 0;

  static async execute(contents: any, config: ExecuteConfig = {}): Promise<string> {
    const states = HealthMonitor.getStates('cerebras');
    if (states.length === 0) throw new Error("No Cerebras keys available.");

    let promptText = "";
    if (typeof contents === "string") {
      promptText = contents;
    } else if (Array.isArray(contents)) {
      promptText = contents.map(c => {
         if (c.text) return c.text;
         if (c.inlineData) return "[Image data attached - Supported on Gemini only]";
         return JSON.stringify(c);
      }).join("\n");
    }

    const maxAttempts = states.length;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const state = states[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % states.length;
      attempts++;

      // Check status
      if (state.status === "HARD_LOCKED" || state.is_banned || state.status === "ISOLATED") {
        continue;
      }

      // Check 10-12s throttle
      const now = Date.now();
      if (now < (state.throttleUntil || 0)) {
        continue; // hop to next key
      }
      state.throttleUntil = now + Math.floor(Math.random() * 2000) + 10000;

      // Jitter
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 400) + 200));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      try {
        const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${state.key}` },
          body: JSON.stringify({
            model: "llama3.1-8b",
            messages: [
               ...(config.systemInstruction ? [{ role: "system", content: config.systemInstruction }] : []),
               { role: "user", content: promptText }
            ],
            temperature: config.temperature ?? 0.3,
            max_completion_tokens: config.maxOutputTokens || 8192,
            ...(config.responseMimeType === "application/json" ? { response_format: { type: "json_object" } } : {})
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
           const errText = await res.text();
           throw { status: res.status, message: errText };
        }

        const data = await res.json();
        const responseText = data?.choices?.[0]?.message?.content || "";
        
        if (responseText) {
           HealthMonitor.reportUsage('cerebras', state.index);
           return responseText;
        }
      } catch (err: any) {
        const is429 = err.status === 429 || err.status >= 500 || err.message?.includes("429");
        const isFatal = err.status === 401 || err.status === 403;
        HealthMonitor.reportError('cerebras', state.index, is429, isFatal, err.message || err.toString());
      }
    }
    
    throw new Error("All Cerebras keys exhausted or locked.");
  }

  static async *executeStream(contents: any, config: ExecuteConfig = {}): AsyncGenerator<string, void, unknown> {
    const states = HealthMonitor.getStates('cerebras');
    if (states.length === 0) throw new Error("No Cerebras keys available.");

    let promptText = "";
    if (typeof contents === "string") {
      promptText = contents;
    } else if (Array.isArray(contents)) {
      promptText = contents.map(c => {
         if (c.text) return c.text;
         if (c.inlineData) return "[Image data attached - Supported on Gemini only]";
         return JSON.stringify(c);
      }).join("\n");
    }

    const maxAttempts = states.length;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const state = states[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % states.length;
      attempts++;

      if (state.status === "HARD_LOCKED" || state.is_banned || state.status === "ISOLATED") {
        continue;
      }

      const now = Date.now();
      if (now < (state.throttleUntil || 0)) {
        continue;
      }
      state.throttleUntil = now + Math.floor(Math.random() * 2000) + 10000;

      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 400) + 200));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      let startedYielding = false;
      try {
        const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${state.key}` },
          body: JSON.stringify({
            model: "llama3.1-8b",
            messages: [
               ...(config.systemInstruction ? [{ role: "system", content: config.systemInstruction }] : []),
               { role: "user", content: promptText }
            ],
            temperature: config.temperature ?? 0.3,
            max_completion_tokens: config.maxOutputTokens || 8192,
            stream: true
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
           const errText = await res.text();
           throw { status: res.status, message: errText };
        }

        if (!res.body) throw new Error("No response body");
        
        HealthMonitor.reportUsage('cerebras', state.index);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          let timeoutHandle: any;
          const readPromise = reader.read();
          const timeoutPromise = new Promise((_, reject) => {
             timeoutHandle = setTimeout(() => reject(new Error("Stream read timeout")), 15000);
          });
          const { done, value } = (await Promise.race([readPromise, timeoutPromise])) as any;
          clearTimeout(timeoutHandle);
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  startedYielding = true;
                  yield content;
                }
              } catch (e) {}
            }
          }
        }
        return; 
      } catch (err: any) {
        if (startedYielding) {
           throw err; // if it failed mid-stream, don't try another key and corrupt output
        }
        const is429 = err.status === 429 || err.status >= 500 || err.message?.includes("429");
        const isFatal = err.status === 401 || err.status === 403;
        HealthMonitor.reportError('cerebras', state.index, is429, isFatal, err.message || err.toString());
      }
    }
    throw new Error("All Cerebras keys exhausted or locked.");
  }
}
