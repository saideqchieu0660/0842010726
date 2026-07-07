const fs = require('fs');
let content = fs.readFileSync('server/providers/cerebrasRotator.ts', 'utf-8');

const imports = `import { HealthMonitor } from './healthMonitor';
import { GoogleGenAI } from '@google/genai';
import { SafeParser } from './resilience/safeParser';
`;

content = content.replace(/import \{ HealthMonitor \} from '\.\/healthMonitor';\nimport \{ GoogleGenAI \} from '@google\/genai';/, imports);

// Fix res.json() parsing
content = content.replace(/if \(!res\.ok\) \{[\s\S]*?const data = await res\.json\(\);/m, `const data = await SafeParser.parseFetchResponse(res, "https://api.cerebras.ai/v1/chat/completions", "cerebras");`);

fs.writeFileSync('server/providers/cerebrasRotator.ts', content);
console.log("Updated CerebrasRotator");
