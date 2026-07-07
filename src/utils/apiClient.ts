import { PROXIES } from "./proxyNodes";
import localforage from "localforage";

// Global Circuit Breaker & API Lock State
let isTripped = false;
let tripExpiration = 0;
let isLocked = false;
let lockExpiration = 0;
let isNotificationShowing = false;
let activeCountdownInterval: any = null;

export function isSystemAvailable(): boolean {
  return !isTripped && !isLocked;
}

export function getCooldownTime(): number {
  const maxExp = Math.max(tripExpiration, lockExpiration);
  return Math.max(0, maxExp - Date.now());
}

function handleFailure(type: 'circuit' | 'lock', retryAfter: number) {
  const expiration = Date.now() + retryAfter;
  if (type === 'lock') {
    isLocked = true;
    lockExpiration = expiration;
  } else {
    isTripped = true;
    tripExpiration = expiration;
  }

  if (!isNotificationShowing && typeof window !== 'undefined') {
    isNotificationShowing = true;
    showCountdownNotification();
  }
}

function showCountdownNotification() {
  if (typeof window === 'undefined') return;

  if (activeCountdownInterval) clearInterval(activeCountdownInterval);

  activeCountdownInterval = setInterval(() => {
    const remaining = getCooldownTime();
    if (remaining <= 0) {
      clearInterval(activeCountdownInterval);
      isTripped = false;
      isLocked = false;
      isNotificationShowing = false;
      window.dispatchEvent(new CustomEvent('global-api-error', { 
         detail: { message: `Hệ thống đã kết nối trở lại.`, path: 'system', success: true } 
      }));
      processQueue();
    } else {
      const seconds = Math.ceil(remaining / 1000);
      window.dispatchEvent(new CustomEvent('global-api-error', { 
         detail: { message: `Hệ thống đang bảo vệ quá tải. Khôi phục sau ${seconds}s`, path: 'system' } 
      }));
    }
  }, 1000);
}

const callQueue: any[] = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || callQueue.length === 0) return;
  if (isTripped || isLocked) return;

  isProcessingQueue = true;
  const currentTask = callQueue.shift();

  try {
    const res = await fetchWithRetryAndSafeParse(currentTask.url, currentTask.options);
    currentTask.resolve(res);
  } catch (error) {
    currentTask.reject(error);
  } finally {
    isProcessingQueue = false;
    processQueue();
  }
}

export async function safeRequest(url: string, options?: RequestInit): Promise<Response> {
  if (isTripped || isLocked) {
    const time = Math.ceil(getCooldownTime() / 1000);
    throw new Error(`Hệ thống đang bảo trì tự động. Vui lòng thử lại sau ${time} giây.`);
  }

  const mergedOptions = { ...(options || {}) };
  try {
    const { store } = await import("../lib/store");
    const currentUser = store.getCurrentUser();
    if (currentUser) {
      const headers = { ...(mergedOptions.headers || {}) } as Record<string, string>;
      if (!headers["x-user-id"]) headers["x-user-id"] = currentUser.id || "";
      if (!headers["x-user-role"]) headers["x-user-role"] = currentUser.role || "";
      if (!headers["x-user-is-pro"]) headers["x-user-is-pro"] = currentUser.isPro ? "true" : "false";
      
      try {
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        if (auth.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          if (idToken && !headers["Authorization"]) {
            headers["Authorization"] = `Bearer ${idToken}`;
          }
        }
      } catch (authErr) {}
      mergedOptions.headers = headers;
    }
  } catch (err) {}

  return new Promise((resolve, reject) => {
    callQueue.push({ url, options: mergedOptions, resolve, reject });
    processQueue();
  });
}

class ParsedResponse {
    private data: any;
    ok: boolean;
    status: number;
    constructor(data: any, ok: boolean, status: number) {
        this.data = data;
        this.ok = ok;
        this.status = status;
    }
    json() { return Promise.resolve(this.data); }
}

async function fetchWithRetryAndSafeParse(url: string, options: RequestInit = {}) {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    if (isTripped || isLocked) {
      throw new Error("Request aborted due to active lock.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000 + (attempt * 5000));
    const currentOptions = { ...options, signal: controller.signal };

    try {
      const response = await fetch(url, currentOptions);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      
      if (response.status === 503) {
         let errorData: any = {};
         if (contentType.includes('application/json')) {
            try { errorData = await response.clone().json(); } catch(e) {}
         }
         if (errorData.errorCode === 'SERVER_LOCKED' || errorData.errorCode === 'CIRCUIT_OPEN') {
            handleFailure(errorData.errorCode === 'SERVER_LOCKED' ? 'lock' : 'circuit', errorData.retryAfter || 30000);
            throw new Error(`Hệ thống tạm khóa (${errorData.errorCode}). Thử lại sau.`);
         }
      }

      if (response.status === 402) {
         window.dispatchEvent(new CustomEvent('show-api-setup'));
         throw new Error('API_SETUP_REQUIRED: Yêu cầu thiết lập Personal API Key.');
      }
      const retryableStatuses = [429, 500, 502, 503, 504];
      const nonRetryableStatuses = [400, 401, 403, 404, 409, 422];

      if (response.ok) {
        if (contentType.includes('application/json')) {
            try {
                const data = await response.json();
                return new ParsedResponse(data, true, response.status) as any as Response;
            } catch (e) {
                console.error("JSON parse failed on successful status.");
                throw new Error("Phản hồi không hợp lệ từ máy chủ.");
            }
        }
        return response; 
      } else {
        let text = await response.text();
        let jsonError = null;
        if (contentType.includes('application/json')) {
            try { jsonError = JSON.parse(text); } catch(e) {}
        }
        
        console.error(`[API Error] ${response.status} at ${url}: `, jsonError || text.substring(0,200));
        
        if (nonRetryableStatuses.includes(response.status)) {
            let msg = jsonError?.message || jsonError?.error || `Lỗi HTTP ${response.status}`;
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent('global-api-error', { detail: { message: msg, path: url } }));
            }
            if (jsonError) return new ParsedResponse(jsonError, false, response.status) as any as Response;
            throw new Error(msg);
        }

        if (retryableStatuses.includes(response.status)) {
           if (attempt < maxAttempts) {
              const backoffDelay = Math.pow(2.5, attempt) * 1000 + Math.random() * 1000;
              await new Promise((r) => setTimeout(r, backoffDelay));
              continue;
           } else {
              handleFailure('circuit', 30000);
              throw new Error(`Đã đạt giới hạn tối đa lần thử lại. Lỗi: ${response.status}`);
           }
        }
        
        throw new Error(`Lỗi hệ thống: ${response.status}`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isNetwork = error.name === "AbortError" || error.message?.toLowerCase().includes("timeout") || error.message?.toLowerCase().includes("fetch");
      
      if (isNetwork && attempt < maxAttempts) {
        const backoffDelay = Math.pow(2.5, attempt) * 1000 + Math.random() * 1000;
        await new Promise((r) => setTimeout(r, backoffDelay));
        continue;
      }
      
      if (error.name !== 'AbortError' && attempt >= maxAttempts) {
         handleFailure('circuit', 30000);
      }
      throw error;
    }
  }
  throw new Error(`Yêu cầu thất bại sau ${maxAttempts} lần thử.`);
}

export const apiProviderConfig = {
  openRouter: true,
  gemini: true,
  groq: true,
  deepInfra: true
};

export function updateApiProviderConfig(newConfig: any) {
  Object.assign(apiProviderConfig, newConfig);
}

export const keyRegistry = new Map<string, any>();

export function syncAIPrompts() {}
