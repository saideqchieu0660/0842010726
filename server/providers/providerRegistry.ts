import fs from 'fs';
import path from 'path';

export interface KeyState {
  index: number;
  key: string;
  maskedKey: string;
  status: "active" | "rate_limited" | "quota_exceeded" | "failed" | "HARD_LOCKED" | "ISOLATED";
  is_banned?: boolean;
  errorCount: number;
  usageCount: number;
  lastUsed: Date | null;
  throttleUntil?: number;
  unlockTime?: number;
}

export interface RotationLog {
  id: string;
  timestamp: string;
  fromKeyIndex?: number;
  toKeyIndex: number;
  reason: string;
}

interface ProvidersConfig {
  google: string[];
  cerebras: string[];
  openrouter: string[];
}

export class ProviderRegistry {
  private static config: ProvidersConfig = {
    google: [],
    cerebras: [],
    openrouter: []
  };

  static initialize() {
    // 1. Try to load from providers.json
    try {
      const configPath = path.resolve(process.cwd(), 'providers.json');
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.google) this.config.google.push(...parsed.google);
        if (parsed.cerebras) this.config.cerebras.push(...parsed.cerebras);
        if (parsed.openrouter) this.config.openrouter.push(...parsed.openrouter);
      }
    } catch (err) {
      console.warn("Failed to load providers.json:", err);
    }

    // 2. Load from environment variables to merge
    const envGoogle = [
      process.env.GEMINI_API_KEY, process.env.VITE_GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY_5, process.env.GEMINI_API_KEY_6,
      process.env.GEMINI_API_KEY_7, process.env.GEMINI_API_KEY_8, process.env.GEMINI_API_KEY_9,
      process.env.GEMINI_API_KEY_10, process.env.GEMINI_API_KEY_11, process.env.GEMINI_API_KEY_12
    ];
    
    const envCerebras = [
      process.env.GROQ_API_KEY, process.env.VITE_GROQ_API_KEY,
      process.env.VITE_CEREBRAS_KEY, process.env.VITE_CEREBRAS_KEY_1, process.env.VITE_CEREBRAS_KEY_2,
      process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4, process.env.GROQ_API_KEY_5, process.env.GROQ_API_KEY_6
    ];

    const envOpenRouter = [
      process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_KEY, process.env.VITE_OPENROUTER_API_KEY, process.env.VITE_OPENROUTER_KEY,
      process.env.OPENROUTER_KEY_1, process.env.OPENROUTER_API_KEY_1, process.env.VITE_OPENROUTER_API_KEY_1, process.env.VITE_OPENROUTER_KEY_1,
      process.env.OPENROUTER_KEY_2, process.env.OPENROUTER_API_KEY_2, process.env.VITE_OPENROUTER_API_KEY_2, process.env.VITE_OPENROUTER_KEY_2,
      process.env.OPENROUTER_KEY_3, process.env.OPENROUTER_API_KEY_3, process.env.VITE_OPENROUTER_API_KEY_3, process.env.VITE_OPENROUTER_KEY_3
    ];

    this.addUniqueKeys('google', envGoogle);
    this.addUniqueKeys('cerebras', envCerebras);
    this.addUniqueKeys('openrouter', envOpenRouter);

    // Limit to exactly 3 keys for Google and Cerebras per user request, and disable OpenRouter completely
    this.config.google = this.config.google.slice(0, 3);
    this.config.cerebras = this.config.cerebras.slice(0, 3);
    this.config.openrouter = []; // Disabled

    // Fallbacks if empty
    if (this.config.google.length === 0) {
       for(let i=1; i<=3; i++) this.config.google.push(`mock_google_key_${i}`);
    }
    if (this.config.cerebras.length === 0) {
       for(let i=1; i<=3; i++) this.config.cerebras.push(`mock_cerebras_key_${i}`);
    }
  }

  private static addUniqueKeys(provider: keyof ProvidersConfig, keys: (string | undefined)[]) {
    const validKeys = keys.filter(k => k && k.trim() && k !== "undefined" && k !== "null").map(k => k!.trim());
    for (const key of validKeys) {
      if (!this.config[provider].includes(key)) {
        this.config[provider].push(key);
      }
    }
  }

  static getKeys(provider: keyof ProvidersConfig): string[] {
    return this.config[provider];
  }
}

// Auto-initialize on import
ProviderRegistry.initialize();
