const fs = require('fs');
let file = fs.readFileSync('src/components/Agent3Widget.tsx', 'utf8');

file = file.replace(
`        </div>
      )}
    </>
  );
}`,
`        </div>
      </motion.div>
      )}
    </>
  );
}`
);

fs.writeFileSync('src/components/Agent3Widget.tsx', file);
