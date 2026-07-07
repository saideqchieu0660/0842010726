const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');

if (!file.includes('ApiSetupOverlay')) {
    file = file.replace('import { AdminCreateCards } from "./pages/AdminCreateCards";', 'import { AdminCreateCards } from "./pages/AdminCreateCards";\nimport { ApiSetupOverlay } from "./components/ApiSetupOverlay";');

    file = file.replace(/<Toaster position="top-right" \/>/, `<Toaster position="top-right" />\n      <ApiSetupOverlay />`);

    fs.writeFileSync('src/App.tsx', file);
}
