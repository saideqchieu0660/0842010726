const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminCreateCards.tsx', 'utf-8');

const anchor = `              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Mặt sau (Nghĩa / Lời giải)`;

const uiToInject = `              <div className="space-y-2 p-4 bg-orange-50/30 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl mb-4">
                <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-2">
                  <BrainCircuit className="w-3.5 h-3.5" /> AI Analysis Engine
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={analysisMode}
                    onChange={(e) => setAnalysisMode(e.target.value as any)}
                    className="flex-1 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="auto">Auto Mode (Detect)</option>
                    <option value="preset">Preset Category</option>
                    <option value="custom">Custom Blocks</option>
                  </select>
                  
                  {analysisMode === "preset" && (
                    <select
                      value={presetType}
                      onChange={(e) => setPresetType(e.target.value)}
                      className="flex-1 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      {PRESET_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </div>
                
                {analysisMode === "custom" && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CUSTOM_BLOCK_OPTIONS.map(block => (
                      <button
                        type="button"
                        key={block}
                        onClick={() => {
                          if (customBlocks.includes(block)) {
                            setCustomBlocks(customBlocks.filter(b => b !== block));
                          } else {
                            setCustomBlocks([...customBlocks, block]);
                          }
                        }}
                        className={\`text-xs px-3 py-1.5 rounded-full border transition \${customBlocks.includes(block) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-orange-300'}\`}
                      >
                        {block}
                      </button>
                    ))}
                  </div>
                )}
              </div>

`;

content = content.replace(anchor, uiToInject + anchor);
fs.writeFileSync('src/pages/AdminCreateCards.tsx', content);
console.log("UI Injected.");
