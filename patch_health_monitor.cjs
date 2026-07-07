const fs = require('fs');

let file = fs.readFileSync('src/pages/ApiHealthMonitor.tsx', 'utf8');

if (!file.includes('AdminAISettings')) {
    file = file.replace('import { SystemLinksEditorWidget } from "../components/SystemLinksEditorWidget";', 'import { SystemLinksEditorWidget } from "../components/SystemLinksEditorWidget";\nimport { AdminAISettings } from "../components/AdminAISettings";');

    file = file.replace(/const \[activeTab, setActiveTab\] = useState<"monitor" \| "logs" \| "health">\(/, 'const [activeTab, setActiveTab] = useState<"monitor" | "logs" | "health" | "settings">(');

    const buttonHtml = `
          <button
            onClick={() => setActiveTab("settings")}
            className={\`px-6 py-2 rounded-md text-sm font-medium transition-colors \${activeTab === "settings" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}\`}
          >
            Settings
          </button>
        </div>`;

    file = file.replace(/System Health\n          <\/button>\n        <\/div>/, `System Health\n          </button>${buttonHtml}`);

    file = file.replace(/if \(activeTab === "health"\) \{/, `if (activeTab === "settings") {\n      return <AdminAISettings />;\n    }\n\n    if (activeTab === "health") {`);

    fs.writeFileSync('src/pages/ApiHealthMonitor.tsx', file);
}
