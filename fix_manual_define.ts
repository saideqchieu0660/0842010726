import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const oldEndpoint = `  app.post("/api/automation/manual-define", async (req, res, next) => {
    try {
      const { front, wordForm, mode } = req.body;
      if (!front) {
        return res.status(400).json({ error: true, message: "Thiếu từ khóa front." });
      }

      let modeInstructions = "";
      if (mode === "vocab") {
        modeInstructions = \`
[MODE: Tiếng Anh - Từ vựng]
- Bắt buộc trả về phiên âm IPA chính xác.
- Cung cấp ít nhất 1 ví dụ sinh động.
- NGHĨA CHUYÊN SÂU: Giải thích khái niệm thực sự đằng sau từ đó (VD: thay vì nói "refute = bác bỏ", hãy nói "refute: dùng luận điểm và bằng chứng để chứng minh bên còn lại sai").
- Xác định rõ wordform (từ loại).\`;
      } else if (mode === "error_correction") {
        modeInstructions = \`
[MODE: Tiếng Anh - Sửa lỗi sai]
- Chỉ ra chính xác lỗi sai trong thông tin đầu vào.
- Giải thích điểm ngữ pháp bị sai.
- Nêu rõ cách logic hoạt động thực sự và lý do tại sao lại như thế.\`;
      } else if (mode === "confusing_words") {
        modeInstructions = \`
[MODE: Tiếng Anh - Phân biệt từ dễ nhầm lẫn]
- Phân biệt các từ trong đầu vào bằng các ĐIỂM CHỦ CHỐT.
- Giải thích rõ từ A và từ B khác nhau ở khía cạnh hoặc ngữ cảnh nào.\`;
      } else if (mode === "other_subjects") {
        modeInstructions = \`
[MODE: Các môn học khác - Toán, Lý, Văn...]
- BẮT BUỘC: Sử dụng ký tự Unicode thông thường để viết các công thức (ví dụ: x², √y, α, β) thay vì dùng mã LaTeX (như $x^2$, $\\sqrt{y}$) để tránh vỡ cấu trúc văn bản.\`;
      }

      const requestPrompt = \`[HENOSIS Data Enrichment Policy & Manual Define]
You are a Knowledge Enrichment Engine. 
Your task is to generate complete metadata for a flashcard based on a user-provided term.

INPUT PRIORITY POLICY:
1. MAXIMIZE use of user-provided information. NEVER overwrite valid user definitions.
2. Generate ONLY missing metadata. Use internal knowledge first.
3. Normalize parts of speech to standard forms (Noun, Verb, Adjective, etc.).

\${UNIVERSAL_EXTRACTION_ENGINE_RULES}

[QUY TẮC CHUNG CHO MỌI CHẾ ĐỘ]
- Nếu đầu vào là một câu hỏi chứa các đáp án (A, B, C, D...), bạn PHẢI giải quyết nó như một bài tập bình thường: Đưa ra đáp án đúng và giải thích chi tiết, đồng thời kết hợp với các yêu cầu của chế độ hiện tại.
\${modeInstructions}

Word/Phrase: \${front}
Provided Hint/POS: \${wordForm || "unknown"}

Return a STRICT JSON object representing the flashcard metadata (V3 Standard):
{
  "front": "Word/Phrase [CEFR] (Word_Form) • /IPA_Pronunciation/",
  "definition": "Short meaning/answer (50-70 words) incorporating the rules above.",
  "wordForm": "Legacy field (if applicable)",
  "ipa": "/string/",
  "primaryPartOfSpeech": "Noun|Verb|Adjective...",
  "detectedDomain": "English Vocabulary|Mathematics|Physics|Chemistry|Biology|Computer Science|General",
  "cardType": "Vocabulary Card|Concept Card|Formula Card|Question Card|Definition Card|Theorem Card",
  "confidence": 0.95,
  "extractionReason": "Short explanation",
  "metadataVersion": 3
}

- NO markdown \`\`\`json blocks.
- Return EXACTLY ONE JSON object.\`;

      const responseText = await CrossProviderRotator.execute(requestPrompt);

      let parsedData: any = { definition: (responseText as string).trim(), wordForm: wordForm || "", front: front };
      try {
        const textToParse = (responseText as string).replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const jsonMatch = textToParse.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.definition) parsedData.definition = parsed.definition;
          if (parsed.wordForm) parsedData.wordForm = parsed.wordForm;
          if (parsed.front) parsedData.front = parsed.front;
        }
      } catch (e) {
        console.warn("Failed to parse manual-define JSON fallback to raw text");
      }

      return res.json({ success: true, definition: parsedData.definition, wordForm: parsedData.wordForm, front: parsedData.front });
    } catch (err: any) {
      console.error("Manual Define Error:", err);
      // Let frontend handle the error explicitly.
      return res.status(500).json({ error: true, message: err?.message || "Lỗi khi trích xuất định nghĩa." });
    }
  });`;

const newEndpoint = `  app.post("/api/automation/manual-define", async (req, res, next) => {
    try {
      const { front, wordForm, mode, analysisMode, presetType, customBlocks } = req.body;
      if (!front) {
        return res.status(400).json({ error: true, message: "Thiếu từ khóa front." });
      }

      let requestPrompt = \`[HENOSIS AI Analysis Engine]
Your task is to generate complete metadata for a flashcard based on a user-provided term. The objective is deep understanding, not answer generation. Every response should remove confusion, explain the underlying logic and build lasting intuition.

CORE PHILOSOPHY:
- You are a learning companion, not a dictionary.
- Goal: remove ambiguity, explain reasoning, build intuition, clarify misconceptions, help learners think independently.
- Learners should finish with understanding, not merely the correct answer.

TEACHING PRINCIPLES:
- Always prioritize: removing ambiguity, explaining why, building intuition, distinguishing similar concepts, developing independent thinking.
- Every explanation should answer: What is the core idea? Why does it work? What makes it different? Why is it commonly misunderstood?

ENGLISH RULES:
- Vocabulary: Focus on Core Insight, not dictionary definitions. Highlight the concept that distinguishes the word from similar words. Include blocks like Core Insight, Meaning, Usage, Comparison, Common Mistakes, Examples.
- Grammar: Explain the underlying logic before formulas. Teach why the rule exists, how native speakers think, and common mistakes before introducing patterns.
- Idioms, Collocations & Phrasal Verbs: Explain origin, historical/cultural background, meaning evolution, why the expression uses those words. Promote understanding over memorization.

ADAPTIVE BLOCKS: Select blocks dynamically according to the content. Possible blocks: Core Insight, Underlying Logic, Origin, Meaning, Formula, Timeline, Context, Examples, Comparison, Common Mistakes and Mental Model. Avoid fixed templates.
ADAPTIVE DEPTH: Do not use fixed word limits. Estimate conceptual complexity and automatically adjust explanation depth. Simple topics stay concise; complex topics deserve detailed explanations.
MENTAL MODEL: Whenever useful, include a Mental Model using intuitive analogies, visualization or conceptual frameworks to improve long-term retention.
UNICODE FIRST: Prefer Unicode over LaTeX for mathematics and scientific notation whenever possible (√ π α β θ Δ × ÷ ≤ ≥ ≠ ≈ → ⇒ ∑ ∫ ∞ °). Use LaTeX only when Unicode cannot accurately express advanced notation.

\`;

      if (analysisMode === "preset") {
         requestPrompt += \`[ANALYSIS MODE: PRESET] Category: \${presetType}\\n\`;
      } else if (analysisMode === "custom") {
         requestPrompt += \`[ANALYSIS MODE: CUSTOM] User selected blocks: \${customBlocks?.join(", ")}\\n\`;
      } else {
         requestPrompt += \`[ANALYSIS MODE: AUTO] Detect content type, learning objective, misconceptions, required blocks and response depth automatically.\\n\`;
      }

      requestPrompt += \`
THINK BEFORE GENERATING:
Before producing any output, you MUST determine and output your reasoning inside a <thought_process> XML block:
- content type
- learning objective
- likely misconceptions
- best explanation strategy
- required blocks
- appropriate response depth

After the <thought_process> block, return a STRICT JSON object representing the flashcard metadata (V3 Standard):
{
  "front": "Word/Phrase [CEFR] (Word_Form) • /IPA_Pronunciation/",
  "definition": "The deep explanation incorporating the rules above. Use HTML or Markdown for nice formatting. Do NOT wrap the JSON inside markdown blocks.",
  "wordForm": "Legacy field (if applicable)",
  "ipa": "/string/",
  "primaryPartOfSpeech": "Noun|Verb|Adjective...",
  "detectedDomain": "English Vocabulary|Mathematics|Physics|Chemistry|Biology|Computer Science|General",
  "cardType": "Vocabulary Card|Concept Card|Formula Card|Question Card|Definition Card|Theorem Card",
  "confidence": 0.95,
  "extractionReason": "Short explanation",
  "metadataVersion": 3
}

Word/Phrase: \${front}
Provided Hint/POS: \${wordForm || "unknown"}
\`;

      const responseText = await CrossProviderRotator.execute(requestPrompt);

      let textToParse = (responseText as string).trim();
      
      // Remove <thought_process> blocks
      textToParse = textToParse.replace(/<thought_process>[\\s\\S]*?<\\/thought_process>/g, "").trim();
      // Remove json markdown wrapping if any
      textToParse = textToParse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

      let parsedData: any = { definition: textToParse, wordForm: wordForm || "", front: front };
      try {
        const jsonMatch = textToParse.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.definition) parsedData.definition = parsed.definition;
          if (parsed.wordForm) parsedData.wordForm = parsed.wordForm;
          if (parsed.front) parsedData.front = parsed.front;
        }
      } catch (e) {
        console.warn("Failed to parse manual-define JSON fallback to raw text");
      }

      return res.json({ success: true, definition: parsedData.definition, wordForm: parsedData.wordForm, front: parsedData.front });
    } catch (err: any) {
      console.error("Manual Define Error:", err);
      return res.status(500).json({ error: true, message: err?.message || "Lỗi khi trích xuất định nghĩa." });
    }
  });`;

content = content.replace(oldEndpoint, newEndpoint);

if (content.includes('AI Analysis Engine')) {
    console.log('Successfully replaced manual-define endpoint');
    fs.writeFileSync('server.ts', content);
} else {
    console.log('Failed to replace manual-define endpoint');
}

