const fs = require('fs');
let file = fs.readFileSync('src/components/Agent3Widget.tsx', 'utf8');

file = file.replace(
`        </div>
      </motion.div>
      )}
      </AnimatePresence>`,
`      </motion.div>
      )}
      </AnimatePresence>`
);

fs.writeFileSync('src/components/Agent3Widget.tsx', file);
