const fs = require('fs');

let file = fs.readFileSync('src/components/Agent3Widget.tsx', 'utf8');

file = file.replace(/const fetchAgentLimits = async \(\) => \{[\s\S]*?\}\;/g, 'const fetchAgentLimits = async () => {};');

fs.writeFileSync('src/components/Agent3Widget.tsx', file);
