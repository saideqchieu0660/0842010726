const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const anchor = `      if (analysisMode === "preset") {
         requestPrompt += \`[ANALYSIS MODE: PRESET] Category: \${presetType}\\n\`;
      } else if (analysisMode === "custom") {
         requestPrompt += \`[ANALYSIS MODE: CUSTOM] User selected blocks: \${customBlocks?.join(", ")}\\n\`;
      } else {
         requestPrompt += \`[ANALYSIS MODE: AUTO] Detect content type, learning objective, misconceptions, required blocks and response depth automatically.\\n\`;
      }`;

const newAnchor = `      if (analysisMode === "preset") {
         requestPrompt += \`[ANALYSIS MODE: PRESET] Category: \${presetType}\\n\`;
      } else if (analysisMode === "custom") {
         requestPrompt += \`[ANALYSIS MODE: CUSTOM] User selected blocks: \${customBlocks?.join(", ")}\\n\`;
      } else if (mode) {
         requestPrompt += \`[ANALYSIS MODE: LEGACY PRESET] Apply logic for: \${mode}\\n\`;
      } else {
         requestPrompt += \`[ANALYSIS MODE: AUTO] Detect content type, learning objective, misconceptions, required blocks and response depth automatically.\\n\`;
      }`;

content = content.replace(anchor, newAnchor);
fs.writeFileSync('server.ts', content);
console.log("Server mode updated.");
