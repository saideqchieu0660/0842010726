const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add imports at the top
content = content.replace(
  'import express from "express";',
  'import { ProviderRegistry } from "./server/providers/providerRegistry";\nimport { CerebrasRotator } from "./server/providers/cerebrasRotator";\nimport { CrossProviderRotator } from "./server/providers/crossProviderRotator";\nimport { HealthMonitor } from "./server/providers/healthMonitor";\nimport express from "express";'
);

// 2. Replace hardcoded execute calls with the new rotators
content = content.replace(
  /responseText = await executeGenerateContentRoundRobin\(prompt\);/g,
  'responseText = await CerebrasRotator.execute(prompt);'
);

content = content.replace(
  /responseText = await executeGenerateContentRoundRobin\(prompt, \{\n\s*responseMimeType: "application\/json",\n\s*temperature: 0.3\n\s*\}\);/g,
  'responseText = await CerebrasRotator.execute(prompt, { responseMimeType: "application/json", temperature: 0.3 });'
);

// For unified conversion chunk processing
content = content.replace(
  /const chunkResText = await executeGenerateContentRoundRobin\(prompt, \{ temperature: 0.1 \}\);/g,
  'const chunkResText = await CrossProviderRotator.execute(prompt, { temperature: 0.1 });'
);

// For hydrate card
content = content.replace(
  /const responseTextObj = await executeGenerateContentRoundRobin\(activePrompt, \{\n\s*responseMimeType: isJsonMode \? "application\/json" : "text\/plain",\n\s*temperature: 0.1\n\s*\}\);/g,
  'const responseTextObj = await CrossProviderRotator.execute(activePrompt, { responseMimeType: isJsonMode ? "application/json" : "text/plain", temperature: 0.1 });'
);

// For manual define
content = content.replace(
  /const responseText = await executeGenerateContentRoundRobin\(requestPrompt\);/g,
  'const responseText = await CerebrasRotator.execute(requestPrompt);'
);

// For validate json
content = content.replace(
  /const responseText = await executeGenerateContentRoundRobin\(requestPrompt, \{\n\s*responseMimeType: "application\/json",\n\s*temperature: 0.1\n\s*\}\);/g,
  'const responseText = await CerebrasRotator.execute(requestPrompt, { responseMimeType: "application/json", temperature: 0.1 });'
);

// Lesson plan
content = content.replace(
  /responseText = await executeGenerateContentRoundRobin\(prompt, \{\n\s*responseMimeType: "application\/json",\n\s*temperature: 0.3\n\s*\}\);/g,
  'responseText = await CerebrasRotator.execute(prompt, { responseMimeType: "application/json", temperature: 0.3 });'
);

// Assistant 3
content = content.replace(
  /responseText = await executeGenerateContentRoundRobin\(mcqPrompt, \{\n\s*responseMimeType: "application\/json"\n\s*\}\);/g,
  'responseText = await CerebrasRotator.execute(mcqPrompt, { responseMimeType: "application/json" });'
);
content = content.replace(
  /responseText = await executeGenerateContentRoundRobin\(contents, \{\n\s*systemInstruction: systemPrompt,\n\s*temperature: responseMode === "direct" && responseStyle !== "detailed" \? 0.3 : 0.8,\n\s*maxOutputTokens: 8192\n\s*\}\);/g,
  'responseText = await CerebrasRotator.execute(contents, { systemInstruction: systemPrompt, temperature: responseMode === "direct" && responseStyle !== "detailed" ? 0.3 : 0.8, maxOutputTokens: 8192 });'
);

// Deep extraction (executeGeminiWithRetry -> CerebrasRotator)
content = content.replace(
  /const extractRes = await executeGeminiWithRetry\(async \(ai\) => \{\n\s*return await ai.models.generateContent\(\{\n\s*model: "gemini-2.5-flash",\n\s*contents: \[\n\s*\{ text: "Extract ALL text from this document comprehensively and literally. Do not summarize or explain." \},\n\s*\{ inlineData: \{ data: base64Data, mimeType: mimeType \|\| "application\/pdf" \} \}\n\s*\]\n\s*\}\);\n\s*\}\);\n\s*rawText \+= extractRes.text \+ "\\n\\n";/g,
  `const extractRes = await CerebrasRotator.execute("Extract ALL text from this document comprehensively and literally. Do not summarize or explain.\\n\\n[FILE DATA CONTENT:\\n" + base64Data.substring(0, 5000) + "...]", {});\n           rawText += extractRes + "\\n\\n";`
);

content = content.replace(
  /const extractRes = await executeGeminiWithRetry\(async \(ai\) => \{\n\s*return await ai.models.generateContent\(\{\n\s*model: "gemini-2.5-flash",\n\s*contents: \[\n\s*\{ text: "Extract ALL text from this document comprehensively and literally. Do not summarize or explain." \},\n\s*\{ inlineData: \{ data: finalBase64Data, mimeType: mimeType \|\| "application\/pdf" \} \}\n\s*\]\n\s*\}\);\n\s*\}\);\n\s*rawText \+= extractRes.text \+ "\\n\\n";/g,
  `const extractRes = await CerebrasRotator.execute("Extract ALL text from this document comprehensively and literally. Do not summarize or explain.\\n\\n[FILE DATA CONTENT:\\n" + finalBase64Data.substring(0, 5000) + "...]", {});\n           rawText += extractRes + "\\n\\n";`
);

fs.writeFileSync('server.ts', content);
