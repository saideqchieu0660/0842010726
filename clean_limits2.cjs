const fs = require('fs');
let file = fs.readFileSync('src/components/Agent3Widget.tsx', 'utf8');

file = file.replace(/\{agentLimits && \([\s\S]*?\}\)/g, '');

fs.writeFileSync('src/components/Agent3Widget.tsx', file);
