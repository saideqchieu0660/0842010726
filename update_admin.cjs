const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminCreateCards.tsx', 'utf-8');

// 1. Add states
const stateStr = `  const [front, setFront] = useState("");`;
const newStateStr = `  const [front, setFront] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"auto" | "preset" | "custom">("auto");
  const [presetType, setPresetType] = useState("Vocabulary");
  const [customBlocks, setCustomBlocks] = useState<string[]>([]);
  const PRESET_OPTIONS = ["Vocabulary", "Grammar", "Mathematics", "Science", "History", "Literature"];
  const CUSTOM_BLOCK_OPTIONS = ["Core Insight", "Underlying Logic", "Origin", "Meaning", "Formula", "Timeline", "Context", "Examples", "Comparison", "Common Mistakes", "Mental Model"];
`;
content = content.replace(stateStr, newStateStr);

// 2. Update handleGenerateBack body
const oldApiCall = `      const res = await safeRequest("/api/automation/manual-define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: front, wordForm: wordForm })
      });`;
const newApiCall = `      const res = await safeRequest("/api/automation/manual-define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            front: front, 
            wordForm: wordForm,
            analysisMode,
            presetType,
            customBlocks
        })
      });`;
content = content.replace(oldApiCall, newApiCall);

fs.writeFileSync('src/pages/AdminCreateCards.tsx', content);
console.log("States and API call updated.");
