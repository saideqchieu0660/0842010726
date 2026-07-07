const fs = require('fs');

let content = fs.readFileSync('server/providers/providerRegistry.ts', 'utf-8');

const newKeyState = `export interface KeyState {
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
  
  // New metrics
  healthScore: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}`;

content = content.replace(/export interface KeyState \{[\s\S]*?\}/, newKeyState);

fs.writeFileSync('server/providers/providerRegistry.ts', content);
console.log("Updated KeyState in ProviderRegistry.");
