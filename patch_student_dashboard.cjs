const fs = require('fs');

let file = fs.readFileSync('src/pages/StudentDashboard.tsx', 'utf8');

if (!file.includes('PersonalAISettings')) {
    file = file.replace('import { InteractiveTutorial } from "../components/InteractiveTutorial";', 'import { InteractiveTutorial } from "../components/InteractiveTutorial";\nimport { PersonalAISettings } from "../components/PersonalAISettings";');

    file = file.replace(/<div className="absolute top-0 right-0 p-8 opacity-10">\s*<Settings className="w-48 h-48" \/>\s*<\/div>\s*<div className="relative z-10">\s*<h2 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-100">\s*Cài Đặt Hệ Thống\s*<\/h2>\s*<p className="text-zinc-500 mt-2">\s*Tùy chỉnh trải nghiệm học tập của bạn\s*<\/p>\s*<\/div>/, `$&
          <PersonalAISettings />`);

    fs.writeFileSync('src/pages/StudentDashboard.tsx', file);
}
