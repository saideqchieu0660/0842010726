const fs = require('fs');
let code = fs.readFileSync('server/providers/cerebrasRotator.ts', 'utf8');

const target = `    if (typeof contents === "string") {
      promptText = contents;
    } else if (Array.isArray(contents)) {
      promptText = contents.map(c => {
         if (c.text) return c.text;
         if (c.inlineData) return "[Image data attached - Supported on Gemini only]";
         return JSON.stringify(c);
      }).join("\\n");
    }`;

const replace = `    if (typeof contents === "string") {
      promptText = contents;
    } else if (Array.isArray(contents)) {
      promptText = contents.map(c => {
         if (typeof c === "string") return c;
         if (c.parts) return c.parts.map(p => p.text || "[Media]").join("\\n");
         if (c.text) return c.text;
         if (c.inlineData) return "[Image data attached - Supported on Gemini only]";
         return JSON.stringify(c);
      }).join("\\n");
    }`;

code = code.split(target).join(replace);
fs.writeFileSync('server/providers/cerebrasRotator.ts', code);
