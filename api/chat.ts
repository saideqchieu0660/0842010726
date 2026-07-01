export const runtime = 'edge';

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { safeFetch } from "../src/utils/safeFetch";

// Khởi tạo Upstash Redis cho Rate Limiting & Caching
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const cache = new Map();

// Cấu hình chặn spam: 5 request / 10s cho mỗi IP
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  ephemeralCache: cache, // In-memory caching for ultra speed
});

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Stateless Verification Middleware
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "[Stateless Auth] Token missing. Blocked at CDN border." }), { status: 401 });
  }

  // Lấy IP người dùng để giới hạn rate limit toàn cầu (Cloudflare/Vercel)
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  
  if (process.env.UPSTASH_REDIS_REST_URL) {
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);
      if (!success) {
        return new Response(
          JSON.stringify({ error: "[Circuit Breaker] Quá tải request. Vui lòng thử lại sau vài giây." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          }
        );
      }
  }

  const payload = await req.json();
  const messages = payload.messages;
  const model = payload.model || "openai/gpt-oss-120b:free";
  const temperature = payload.temperature ?? 0.7;

  // --- CONTENT SAFETY & PROHIBITED KEYWORD FILTER ---
  if (messages && Array.isArray(messages)) {
    const forbiddenKeywords = [
      "hack", "exploit", "bypass", "malware", "virus", "phishing",
      "nsfw", "porn", "violence", "kill", "murder", "suicide"
    ];
    const promptText = messages.map((m: any) => m.content).join(" ").toLowerCase();
    for (const keyword of forbiddenKeywords) {
      if (promptText.includes(keyword)) {
        return new Response(JSON.stringify({ error: `[Content Safety] Request blocked due to prohibited keyword: ${keyword}.` }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    }
  }

  // Lấy danh sách pool key Cerebras
  const CEREBRAS_KEYS: string[] = [];
  for (let i = 1; i <= 9; i++) {
    const k = process.env[`VITE_CEREBRAS_KEY_${i}`];
    if (k && !CEREBRAS_KEYS.includes(k)) CEREBRAS_KEYS.push(k);
  }
  const fallbackKey = process.env.VITE_CEREBRAS_KEY || "";
  if (fallbackKey && !CEREBRAS_KEYS.includes(fallbackKey)) CEREBRAS_KEYS.push(fallbackKey);
  
  if (CEREBRAS_KEYS.length === 0) {
      return new Response(JSON.stringify({ error: "Missing Cerebras API Key in Edge Pool" }), { status: 500 });
  }

  let cerebrasKey = "";
  const now = Date.now();
  
  // Find a key that is not locked (10s throttle or 60s isolation)
  let startIndex = cache.get("cerebrasIndex") || 0;
  let attempts = 0;
  
  while (attempts < CEREBRAS_KEYS.length) {
      const k = CEREBRAS_KEYS[startIndex];
      const unlockTime = cache.get(`lock_${k}`) || 0;
      if (now >= unlockTime) {
          cerebrasKey = k;
          // Set 10-12s throttle delay for the chosen key
          const throttleDelay = Math.floor(Math.random() * 2000) + 10000;
          cache.set(`lock_${k}`, now + throttleDelay);
          break;
      }
      startIndex = (startIndex + 1) % CEREBRAS_KEYS.length;
      attempts++;
  }
  
  // If all keys are locked, just gracefully queue (or wait) by taking the next one, but edge function can't wait too long. We will just take the fallback or the first key.
  if (!cerebrasKey) {
     cerebrasKey = CEREBRAS_KEYS[cache.get("cerebrasIndex") || 0];
  }

  cache.set("cerebrasIndex", (startIndex + 1) % CEREBRAS_KEYS.length);

  try {
    const response = await safeFetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cerebrasKey}`
      },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages,
        temperature: temperature,
        stream: true // ⚡ Bật Server-Sent Events (SSE) Streaming
      })
    });

    if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
            // Apply 60s isolation lock for this key
            cache.set(`lock_${cerebrasKey}`, Date.now() + 60000);
        }
        return new Response(await response.text(), { status: response.status });
    }

    // ⚡ Trả trực tiếp Stream Data (SSE) về máy khách không lưu trong buffer bộ nhớ
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Edge Proxy Stream Error", details: error.message }), { status: 500 });
  }
}
