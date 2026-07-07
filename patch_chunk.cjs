const fs = require('fs');
let file = fs.readFileSync('server.ts', 'utf8');

file = file.replace(/if \(userId && userRole === "student" && !isPro\) \{\s*const quotaCheck = await checkAndUpdateAiQuota\(userId, isPro, userRole\);\s*if \(!quotaCheck.allowed\) \{\s*return res\.status\(429\)\.json\(\{[\s\S]*?\}\);\s*\}\s*\}/g, '');

fs.writeFileSync('server.ts', file);
