import { ResponseClassifier, ResponseClassification } from './ResponseClassifier';
import { PromptRewriter } from './PromptRewriter';
import { ContextReducer } from './ContextReducer';
import { Logger } from './Logger';
import { MetricsCollector } from './MetricsCollector';

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  isJsonExpected?: boolean;
}

export class RetryManager {
  /**
   * Executes an LLM call with intelligent retry logic.
   * Handles exponential backoff and context/prompt rewriting on false refusals.
   */
  static async executeWithRetry(
    executeFn: (contents: any) => Promise<string>,
    initialContents: any,
    config: RetryConfig = { maxAttempts: 3, baseDelayMs: 1000 }
  ): Promise<{ response: string, classification: string }> {
    
    let attempts = 0;
    let currentContents = initialContents;
    let lastError: any = null;
    let lastClassification: ResponseClassification = ResponseClassification.UNKNOWN;
    
    while (attempts < config.maxAttempts) {
      attempts++;
      const startTime = Date.now();
      
      try {
        const responseText = await executeFn(currentContents);
        const latency = Date.now() - startTime;
        
        // 1. Classify the response
        const classification = ResponseClassifier.classify(responseText);
        
        // 2. Log metrics
        MetricsCollector.recordRequest(latency, classification, responseText.length / 4);
        
        if (classification === ResponseClassification.GENUINE) {
           if (attempts > 1) {
              MetricsCollector.recordSuccessfulRetry();
              Logger.log("Retry_Success", { attempts, latency });
           }
           return { response: responseText, classification };
        }

        lastClassification = classification;
        Logger.log("Refusal_Detected", { classification, attempt: attempts, response: responseText.substring(0, 100) });

        // 3. Handle specific refusal types
        if (classification === ResponseClassification.UNNECESSARY_REFUSAL) {
            // Rewrite prompt and compress context for next attempt
            if (typeof currentContents === "string") {
                currentContents = PromptRewriter.rewrite(currentContents);
            } else if (Array.isArray(currentContents)) {
                currentContents = ContextReducer.reduce(currentContents);
                // Try rewriting the last user prompt
                const lastIdx = currentContents.length - 1;
                if (lastIdx >= 0 && currentContents[lastIdx].role === "user") {
                    currentContents[lastIdx].content = PromptRewriter.rewrite(currentContents[lastIdx].content);
                }
            }
        } else if (classification === ResponseClassification.POLICY_REFUSAL) {
            // Hard policy block, usually no point in retrying unless we heavily rewrite
            break; 
        }
        
      } catch (err: any) {
        lastError = err;
        const latency = Date.now() - startTime;
        lastClassification = ResponseClassifier.classify("", err);
        
        MetricsCollector.recordRequest(latency, lastClassification, 0);
        Logger.error("API_Execution_Error", err, { attempt: attempts });
        
        if (lastClassification === ResponseClassification.POLICY_REFUSAL) {
            break; // Stop retrying on hard 400s / Safety blocks
        }
      }

      // 4. Exponential Backoff
      if (attempts < config.maxAttempts) {
         const delay = config.baseDelayMs * Math.pow(2, attempts - 1) + Math.random() * 500;
         await new Promise(res => setTimeout(res, delay));
      }
    }

    // All retries exhausted or hard failure
    throw {
       classification: lastClassification,
       error: lastError,
       message: "Max retries reached or hard policy block."
    };
  }
}
