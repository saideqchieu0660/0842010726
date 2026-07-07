const fs = require('fs');
let file = fs.readFileSync('src/components/Agent3Widget.tsx', 'utf8');

file = file.replace(
/                 Agent 3 - Socratic Coach\s*\);\s*\}\s*\}\s*\}\}/,
`                 Agent 3 - Socratic Coach
               </h3>
             </div>
             <div className="flex justify-end gap-1 items-center">
              <button
                type="button"
                onClick={() => setIsCreateNewSet(false)}`
);

fs.writeFileSync('src/components/Agent3Widget.tsx', file);
