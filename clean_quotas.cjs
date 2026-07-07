const fs = require('fs');

const files = [
  'src/components/Agent3Widget.tsx',
  'src/pages/StudyRoom.tsx',
  'src/components/DocumentConverter.tsx',
  'src/components/OfflineStorageProgressWidget.tsx', // Actually offline storage progress widget is for disk quota not AI quota. So keep it!
  'src/pages/ApiHealthMonitor.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (file.includes('DocumentConverter.tsx')) {
       // Remove fetchUserAiQuota block
       content = content.replace(/const fetchUserAiQuota = useCallback.*?}, \[.*?\]\);/gs, 'const fetchUserAiQuota = () => {};');
       // Remove aiUsage UI
       content = content.replace(/<div className="flex items-center gap-2 mb-2">[\s\S]*?<div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">[\s\S]*?<\/div>\s*<\/div>/g, '');
    }
    
    if (file.includes('Agent3Widget.tsx')) {
       content = content.replace(/const \[agentLimits, setAgentLimits\] = useState<any>\(null\);/g, '');
       content = content.replace(/\{agentLimits && !agentLimits\.isPro && \([\s\S]*?\}\)/g, '');
       content = content.replace(/const fetchAgentLimits = async \(\) => \{\};/g, '');
       content = content.replace(/fetchAgentLimits\(\);/g, '');
    }

    if (file.includes('StudyRoom.tsx')) {
       content = content.replace(/const \[agentLimits, setAgentLimits\] = useState<any>\(null\);/g, '');
       content = content.replace(/const fetchAgentLimits = async \(\) => \{\s*try \{[\s\S]*?catch \(err\) \{\s*console\.error\("Error fetching agent limits:", err\);\s*\}\s*\};/g, '');
       content = content.replace(/fetchAgentLimits\(\);/g, '');
    }
    
    fs.writeFileSync(file, content);
  }
}

