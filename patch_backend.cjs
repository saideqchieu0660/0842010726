const fs = require('fs');

let rotator = fs.readFileSync('server/providers/crossProviderRotator.ts', 'utf8');
if (!rotator.includes('executePersonal')) {
    const personalMethods = `
  static async executePersonal(contents: any, key: string, provider: 'google' | 'cerebras', config: ExecuteConfig = {}): Promise<string> {
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        const res = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: contents,
           config: config
        });
        return res.text || "";
    } else {
        const fetch = require('node-fetch');
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${key}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: typeof contents === 'string' ? [{role: 'user', content: contents}] : contents,
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxOutputTokens
            })
        });
        if (!res.ok) throw new Error(\`Cerebras Personal API Error: \${res.statusText}\`);
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
    }
  }

  static async *executePersonalStream(contents: any, key: string, provider: 'google' | 'cerebras', config: ExecuteConfig = {}): AsyncGenerator<string, void, unknown> {
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        const res = await ai.models.generateContentStream({
           model: "gemini-2.5-flash",
           contents: contents,
           config: config
        });
        for await (const chunk of res) {
            if (chunk.text) yield chunk.text;
        }
    } else {
        const fetch = require('node-fetch');
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${key}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                messages: typeof contents === 'string' ? [{role: 'user', content: contents}] : contents,
                temperature: config.temperature ?? 0.7,
                stream: true,
                max_tokens: config.maxOutputTokens
            })
        });
        if (!res.ok) throw new Error(\`Cerebras Personal API Error: \${res.statusText}\`);
        if (!res.body) throw new Error('No response body');
        for await (const chunk of res.body) {
            const str = chunk.toString();
            const lines = str.split('\\n').filter(l => l.startsWith('data: '));
            for (const line of lines) {
                if (line === 'data: [DONE]') return;
                try {
                    const data = JSON.parse(line.substring(6));
                    const text = data.choices?.[0]?.delta?.content;
                    if (text) yield text;
                } catch (e) {}
            }
        }
    }
  }
`;
    rotator = rotator.replace('private static async *executeGoogleStream', personalMethods + '\n  private static async *executeGoogleStream');
    fs.writeFileSync('server/providers/crossProviderRotator.ts', rotator);
}
